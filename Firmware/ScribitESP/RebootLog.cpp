#include "RebootLog.hpp"
#include <Preferences.h>
#include <esp_system.h>

namespace
{
    // Cached in RAM after begin() so json() never touches NVS on the /status hot path.
    uint32_t g_total = 0, g_brown = 0, g_crash = 0, g_wdt = 0;
    char g_recent[80] = "";   // CSV of the last few reset reasons, newest first

    const char *reasonStr(esp_reset_reason_t r)
    {
        switch (r)
        {
        case ESP_RST_POWERON:   return "poweron";
        case ESP_RST_BROWNOUT:  return "brownout";
        case ESP_RST_TASK_WDT:
        case ESP_RST_INT_WDT:
        case ESP_RST_WDT:       return "watchdog";
        case ESP_RST_PANIC:     return "crash";
        case ESP_RST_SW:        return "software";
        case ESP_RST_EXT:       return "external";
        case ESP_RST_DEEPSLEEP: return "deepsleep";
        default:                return "unknown";
        }
    }
}

void RebootLog::begin()
{
    esp_reset_reason_t rr = esp_reset_reason();
    const char *r = reasonStr(rr);

    Preferences prefs;
    prefs.begin("diag", false);   // read-write NVS namespace
    g_total = prefs.getUInt("total", 0);
    g_brown = prefs.getUInt("brown", 0);
    g_crash = prefs.getUInt("crash", 0);
    g_wdt   = prefs.getUInt("wdt", 0);
    String recent = prefs.getString("recent", "");

    // Only tally UNEXPECTED resets — a normal power-on or a deliberate software restart
    // (e.g. an OTA update) is not a fault and must not inflate the counters.
    bool unexpected = (rr == ESP_RST_BROWNOUT || rr == ESP_RST_PANIC ||
                       rr == ESP_RST_TASK_WDT || rr == ESP_RST_INT_WDT || rr == ESP_RST_WDT);
    if (unexpected)
    {
        g_total++;
        if (rr == ESP_RST_BROWNOUT)      g_brown++;
        else if (rr == ESP_RST_PANIC)    g_crash++;
        else                             g_wdt++;

        // Prepend this reason and keep at most the newest 6 (also bounds the string).
        recent = String(r) + (recent.length() ? "," + recent : "");
        int commas = 0, cut = -1;
        for (int i = 0; i < (int)recent.length(); i++)
            if (recent[i] == ',' && ++commas == 6) { cut = i; break; }
        if (cut > 0) recent = recent.substring(0, cut);

        prefs.putUInt("total", g_total);
        prefs.putUInt("brown", g_brown);
        prefs.putUInt("crash", g_crash);
        prefs.putUInt("wdt", g_wdt);
        prefs.putString("recent", recent);
    }
    prefs.end();

    recent.toCharArray(g_recent, sizeof(g_recent));
}

int RebootLog::json(char *buf, size_t len)
{
    return snprintf(buf, len,
        "\"reboots\":{\"total\":%u,\"brownout\":%u,\"crash\":%u,\"watchdog\":%u,\"recent\":\"%s\"}",
        g_total, g_brown, g_crash, g_wdt, g_recent);
}
