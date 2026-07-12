#include "RebootLog.hpp"
#include <Preferences.h>
#include <esp_system.h>
#include <esp_attr.h>
#include <string.h>

// Breadcrumb kept in RTC memory: retained across a panic/watchdog/software reset (only a
// power-off or brownout clears it). So after a crash-reset we can read back what the
// firmware was last doing.
#define CRUMB_MAGIC 0x5C21B17Au
static RTC_NOINIT_ATTR struct { uint32_t magic, seq; char phase[24]; char line[48]; } g_crumb;

namespace
{
    // Cached in RAM after begin() so json() never touches NVS on the /status hot path.
    uint32_t g_total = 0, g_brown = 0, g_crash = 0, g_wdt = 0;
    char g_recent[80] = "";   // CSV of the last few reset reasons, newest first
    // Captured crash breadcrumb from the boot BEFORE this one (empty phase = none).
    uint32_t g_crashSeq = 0;
    char g_crashPhase[24] = "", g_crashLine[48] = "";

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

    // Crash breadcrumb: if this boot followed a crash/watchdog (NOT brownout, which wipes
    // RTC), and the RTC crumb is valid, capture what the firmware was doing when it died.
    bool crashy = (rr == ESP_RST_PANIC || rr == ESP_RST_TASK_WDT || rr == ESP_RST_INT_WDT || rr == ESP_RST_WDT);
    if (crashy && g_crumb.magic == CRUMB_MAGIC && g_crumb.phase[0])
    {
        g_crashSeq = g_crumb.seq;
        strncpy(g_crashPhase, g_crumb.phase, sizeof(g_crashPhase) - 1);
        strncpy(g_crashLine, g_crumb.line, sizeof(g_crashLine) - 1);
    }
    // (Re)initialise the crumb for this session so a stale one isn't reported next boot.
    g_crumb.magic = CRUMB_MAGIC; g_crumb.seq = 0; g_crumb.phase[0] = 0; g_crumb.line[0] = 0;

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

void RebootLog::mark(const char *phase, uint32_t seq, const char *line)
{
    g_crumb.magic = CRUMB_MAGIC;
    g_crumb.seq = seq;
    strncpy(g_crumb.phase, phase ? phase : "", sizeof(g_crumb.phase) - 1);
    g_crumb.phase[sizeof(g_crumb.phase) - 1] = 0;
    // Copy the line up to the first comment/newline, dropping JSON-hostile chars.
    size_t j = 0;
    if (line)
        for (size_t i = 0; line[i] && line[i] != ';' && line[i] != '\n' && line[i] != '\r' && j < sizeof(g_crumb.line) - 1; i++)
        {
            char c = line[i];
            if (c == '"' || c == '\\' || (unsigned char)c < 0x20) continue;
            g_crumb.line[j++] = c;
        }
    g_crumb.line[j] = 0;
}

int RebootLog::json(char *buf, size_t len)
{
    return snprintf(buf, len,
        "\"reboots\":{\"total\":%u,\"brownout\":%u,\"crash\":%u,\"watchdog\":%u,\"recent\":\"%s\","
        "\"crashPhase\":\"%s\",\"crashSeq\":%u,\"crashLine\":\"%s\"}",
        g_total, g_brown, g_crash, g_wdt, g_recent, g_crashPhase, g_crashSeq, g_crashLine);
}
