# Minimal Rebuild Plan

Based on the issues:
1. Gmail links not being detected
2. Dashboard buttons not working
3. Overall complexity causing problems

## Root Cause
The current implementation is too complex and has issues with:
- Event handling in Gmail's dynamic environment
- Popup communication
- Content script injection timing

## Solution: Minimal Working Version

I'll create a simpler version that:
1. Uses webNavigation API instead of click interception (more reliable)
2. Simplifies the popup to just show status
3. Focuses on core functionality that works

This matches the original Smart EasyPiky approach better.

## Implementation Steps
1. Switch from click interception to webNavigation.onBeforeNavigate
2. Simplify popup to basic status display
3. Remove complex logging
4. Test on Gmail

Starting implementation now...
