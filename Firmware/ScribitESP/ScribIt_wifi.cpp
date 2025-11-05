#include "WiFi.h"
#include "Esp.h"
#include "WiFiServer.h"

#include "SIConfig.hpp"
#include "ScribIt.hpp"

void replyBadRequest(WiFiClient &client, const char *error, const uint8_t t_ID[6])
{
    client.println("HTTP/1.1 200 OK");
    client.println("Content-type:application/json");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
    client.println("Access-Control-Max-Age: 86400");
    client.println("Access-Control-Allow-Headers: Authorization, accesstoken, Content-Type");
    client.println();
    client.printf("{ \"Error\":\" %s\", \"code\":\"%.2x%.2x%.2x%.2x%.2x%.2x\"}", error, t_ID[0], t_ID[1], t_ID[2], t_ID[3], t_ID[4], t_ID[5]);
    client.println();
    client.println();
    client.stop();
}

void replyOK(WiFiClient &client, const uint8_t t_ID[6])
{
    client.println("HTTP/1.1 200 OK");
    client.println("Content-type:application/json");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
    client.println("Access-Control-Max-Age: 86400");
    client.println("Access-Control-Allow-Headers: Authorization, accesstoken, Content-Type");
    client.println();
    client.printf("{ \"code\":\"%.2x%.2x%.2x%.2x%.2x%.2x\"}", t_ID[0], t_ID[1], t_ID[2], t_ID[3], t_ID[4], t_ID[5]);
    client.println();
    client.stop();
}

bool ScribIt::connectToWiFi(const char *ssid, const char *pass)
{
    WiFi.begin(ssid, pass);
    uint8_t status = WiFi.waitForConnectResult();
    if (status == WL_CONNECTED)
    {
        return true;
    }
    else
    {
        return false;
    }
}

bool ScribIt::parseWifiConfigJSON(const char *buffer, char *ssid, char *pass)
{
    StaticJsonBuffer<JSON_MAX_LEN> jsonBuffer;
    JsonObject &root = jsonBuffer.parseObject(buffer);
    if (!root.success())
    {
        ssid[0] = 0;
        pass[0] = 0;
        return false;
    }

    //Set-up wifi
    const char *tempSsid = root["ssid"];
    const char *tempPass = root["password"];
    //Check parameters---------------------------
    if (tempSsid != nullptr)
    {
        //Copy string
        strcpy(ssid, tempSsid);
    }
    else
    {
        ssid[0] = 0;
    }

    if (tempPass != nullptr)
    {
        //Copy string
        strcpy(pass, tempPass);
    }

    return tempSsid != nullptr;
}

void ScribIt::configureWifi()
{
    char apSsid[16];
    
    //Create wifi server
    WiFiServer wifiServer(SI_WIFICONFIG_PORT);
    WiFiClient client;

    //Torn off wifi
    WiFi.disconnect(true,false);

#ifdef SI_DEBUG_ESP
    Serial.println("No saved WiFi");
    Serial.printf("Wifi status:%d\n", WiFi.status());
    Serial.println("Known wifi not found. AP created");
#endif
    sprintf(apSsid, SI_AP_SSID, m_ID[3], m_ID[4], m_ID[5]);
    //Set-up soft AP
    WiFi.softAP(apSsid, nullptr);

    wifiServer.begin();

#ifdef SI_DEBUG_ESP
    Serial.print("Wait for client\n");
#endif
//Pulse led
    leds.pulse(255, 255, 255, 1, 1);
    //Loop until wifi configured or gcode test requested
    while (!(m_testMode=isTestGcodeRequested()))
    {
        //Ask new client if none from before
        if (!client)
            client = wifiServer.available();

        //If any client
        if (client)
        {
            uint16_t len = 0;
            while (client.available() > 0)
            {
                String s = client.readStringUntil('\n');

                //Parse content length
                if (s.indexOf("Content-Length:") >= 0)
                {
                    len = s.substring(s.indexOf(" ") + 1).toInt();
#ifdef SI_DEBUG_ESP
                    Serial.printf("Content Len=%d\n", len);
#endif
                }
                //Header terminated
                if (s.length() <= 1)
                {
                    //Check body
                    if (len == 0)
                    {
                        replyBadRequest(client, "No body", m_ID);
                    }
                    else if (len > JSON_MAX_LEN)
                    {
                        replyBadRequest(client, "JSON too long", m_ID);
                    }
                    else
                    {
                        //Parse body---------------------------------
                        char buffer[len + 1] = {};
                        client.readBytes(buffer, len);
#ifdef SI_DEBUG_ESP
                        Serial.printf("Body: %s\n", buffer);
#endif
                        char ssid[32];
                        char pass[64];
                        bool status = parseWifiConfigJSON(buffer, ssid, pass);

                        if (!status) //If any parsing error
                        {
                            if (ssid[0] == 0)
                                replyBadRequest(client, "SSID missing", m_ID);
                            else if (pass[0] == 0)
                                replyBadRequest(client, "pwd missing", m_ID);
                            else
                                replyBadRequest(client, "JSON format error", m_ID);
                        }
                        else
                        {
                            //Set-up wifi

#ifdef SI_DEBUG_ESP
                            Serial.printf("Connecting to: %s : %s\n", ssid, pass);
                            Serial.print("IP: ");
                            Serial.println(WiFi.localIP());
#endif
                            replyOK(client, m_ID);
                            leds.doubleBlink(255, 255, 255, 0.5);

                            status = connectToWiFi(ssid, pass);
                            if (status)
                            {
#ifdef SI_DEBUG_ESP
                                Serial.println("Connected.");
#endif
                                leds.setColor(0, 255, 0);
                                delay(500);
                                //Kill AP
                                wifiServer.stop();
                                WiFi.softAPdisconnect();
                                //Restart ESP to avoid trouble
                                ESP.restart();
                                return;
                            }
                            else
                            {
#ifdef SI_DEBUG_ESP
                                Serial.println("Unable to connect to wi-fi.");
#endif
                                //Turn led red for 2 sec
                                leds.setColor(255, 0, 0);
                                delay(2000);
                            }

                            //Blink led
                            leds.pulse(255, 255, 255, 1, 1);
                        }
                    }
                }
            }
        }
    }
}

void ScribIt::handleHTTPRequests()
{
    WiFiClient client = m_localServer->available();
    if (!client)
        return;

    //Wait for data
    uint32_t timeout = millis();
    while (!client.available() && millis() - timeout < 1000)
    {
        delay(1);
    }

    if (!client.available())
    {
        client.stop();
        return;
    }

    //Read request line
    String reqLine = client.readStringUntil('\n');
    String method = "";
    String path = "";

    //Parse method and path
    int firstSpace = reqLine.indexOf(' ');
    int secondSpace = reqLine.indexOf(' ', firstSpace + 1);
    if (firstSpace > 0 && secondSpace > firstSpace)
    {
        method = reqLine.substring(0, firstSpace);
        path = reqLine.substring(firstSpace + 1, secondSpace);
    }

    //Read headers
    uint16_t contentLen = 0;
    while (client.available())
    {
        String line = client.readStringUntil('\n');
        if (line.indexOf("Content-Length:") >= 0)
        {
            contentLen = line.substring(line.indexOf(" ") + 1).toInt();
        }
        if (line.length() <= 1)
            break; //End of headers
    }

    //Route requests
    if (path == "/status" && method == "GET")
    {
        //Return device status
        const char *stateStr = "UNKNOWN";
        switch (m_state)
        {
        case SI_IDLE:
            stateStr = "IDLE";
            break;
        case SI_PRINTING:
            stateStr = "PRINTING";
            break;
        case SI_ERASING:
            stateStr = "ERASING";
            break;
        case SI_BOOT:
            stateStr = "BOOT";
            break;
        case SI_ERROR:
            stateStr = "ERROR";
            break;
        default:
            break;
        }

        //Get pause state
        PausedState ps = sm.getPausedState();
        const char *pauseStr = "running";
        if (ps == SIPS_PAUSED)
            pauseStr = "paused";
        else if (ps == SIPS_REQUESTED)
            pauseStr = "pausing";

        client.println("HTTP/1.1 200 OK");
        client.println("Content-Type: application/json");
        client.println("Access-Control-Allow-Origin: *");
        client.println();
        client.printf("{\"state\":\"%s\",\"paused\":\"%s\",\"id\":\"%.2x%.2x%.2x%.2x%.2x%.2x\"}\n",
                      stateStr, pauseStr, m_ID[0], m_ID[1], m_ID[2], m_ID[3], m_ID[4], m_ID[5]);
    }
    else if (path == "/upload" && method == "POST")
    {
        //Upload g-code file
        if (contentLen == 0 || contentLen > 1024 * 1024) //Max 1MB
        {
            client.println("HTTP/1.1 400 Bad Request");
            client.println("Content-Type: application/json");
            client.println();
            client.println("{\"error\":\"Invalid content length\"}");
        }
        else if (m_state != SI_IDLE)
        {
            client.println("HTTP/1.1 409 Conflict");
            client.println("Content-Type: application/json");
            client.println();
            client.println("{\"error\":\"Device not idle\"}");
        }
        else
        {
            //Read g-code content
            String gcode = "";
            uint16_t bytesRead = 0;
            while (bytesRead < contentLen && client.available())
            {
                char c = client.read();
                gcode += c;
                bytesRead++;
            }

            //Save to SPIFFS
            if (saveGcodeStringInFile(gcode, SI_TEMPORARY_GCODE_PATH))
            {
                client.println("HTTP/1.1 200 OK");
                client.println("Content-Type: application/json");
                client.println();
                client.printf("{\"status\":\"uploaded\",\"size\":%d}\n", bytesRead);

                //Start printing
                setState(SI_PRINTING);
                sm.streamLocalFile();
            }
            else
            {
                client.println("HTTP/1.1 500 Internal Server Error");
                client.println("Content-Type: application/json");
                client.println();
                client.println("{\"error\":\"SPIFFS write failed\"}");
            }
        }
    }
    else if (path == "/pause" && method == "POST")
    {
        //Pause g-code execution
        if (m_state != SI_PRINTING && m_state != SI_ERASING)
        {
            client.println("HTTP/1.1 409 Conflict");
            client.println("Content-Type: application/json");
            client.println();
            client.printf("{\"error\":\"Cannot pause in state %d\"}\n", m_state);
        }
        else
        {
            PausedState ps = sm.getPausedState();
            if (ps != SIPS_RUNNING)
            {
                client.println("HTTP/1.1 409 Conflict");
                client.println("Content-Type: application/json");
                client.println();
                const char *pauseState = (ps == SIPS_PAUSED ? "paused" : "pause requested");
                client.printf("{\"error\":\"Already %s\"}\n", pauseState);
            }
            else
            {
                sm.setPause(true);
                //Stop printing timer
                m_printingTime += millis() - m_startPrintingT;

                client.println("HTTP/1.1 200 OK");
                client.println("Content-Type: application/json");
                client.println();
                client.println("{\"status\":\"paused\"}");
            }
        }
    }
    else if (path == "/resume" && method == "POST")
    {
        //Resume g-code execution
        if (m_state != SI_PRINTING && m_state != SI_ERASING)
        {
            client.println("HTTP/1.1 409 Conflict");
            client.println("Content-Type: application/json");
            client.println();
            client.printf("{\"error\":\"Cannot resume in state %d\"}\n", m_state);
        }
        else
        {
            PausedState ps = sm.getPausedState();
            if (ps == SIPS_RUNNING)
            {
                client.println("HTTP/1.1 409 Conflict");
                client.println("Content-Type: application/json");
                client.println();
                client.println("{\"error\":\"Not paused\"}");
            }
            else
            {
                sm.setPause(false);
                //Restart printing timer
                m_startPrintingT = millis();

                client.println("HTTP/1.1 200 OK");
                client.println("Content-Type: application/json");
                client.println();
                client.println("{\"status\":\"resumed\"}");
            }
        }
    }
    else
    {
        //404 Not found
        client.println("HTTP/1.1 404 Not Found");
        client.println("Content-Type: text/plain");
        client.println();
        client.println("Not Found");
    }

    client.stop();
}
