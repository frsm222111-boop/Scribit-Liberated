#ifndef REBOOTLOG_HPP
#define REBOOTLOG_HPP

#include <Arduino.h>

// Persistent reboot log (survives power cycles via NVS).
//
// The /status "reset" field only reports the SINGLE last reset reason, which is lost
// the moment the user power-cycles the robot. This records a running COUNT of the
// unexpected resets (brownout / crash / watchdog) plus the last few reasons, so the
// diagnostic report shows a PATTERN — e.g. "brownout x5, each after a draw" points
// unambiguously at a power problem instead of leaving it to guesswork.
namespace RebootLog
{
    // Read the persisted counters and this boot's reset reason; if the reset was
    // unexpected, tally it and persist. Call ONCE, early in setup().
    void begin();

    // Emit the "reboots" JSON field value (no leading comma) into buf:
    //   "reboots":{"total":5,"brownout":5,"crash":0,"watchdog":0,"recent":"brownout,poweron"}
    // buf should be >= 180 bytes. Returns snprintf's return value.
    int json(char *buf, size_t len);
}

#endif // REBOOTLOG_HPP
