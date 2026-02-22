# Push Notification & Tone/Vibration Settings - Test Plan

## Overview
This test plan verifies the end-to-end functionality of push notification and tone/vibration settings in the MedMeister app.

## Prerequisites
- Physical device (iOS/Android) for full testing
- Expo development build or production app
- Database access to verify setting changes

## Test Cases

### 1. Database Integration Tests

#### 1.1 Verify Database Schema
- [ ] Confirm `push_notifications_enabled` column exists in users table
- [ ] Confirm `sound_vibration_enabled` column exists in users table
- [ ] Verify default values are `true` for both columns
- [ ] Check that existing users have default values populated

#### 1.2 Settings Persistence
- [ ] Toggle push notifications ON → Verify database shows `true`
- [ ] Toggle push notifications OFF → Verify database shows `false`
- [ ] Toggle sound/vibration ON → Verify database shows `true`
- [ ] Toggle sound/vibration OFF → Verify database shows `false`
- [ ] Restart app → Verify settings persist from database

### 2. Permission Management Tests

#### 2.1 Initial Permission State
- [ ] Fresh install: Check permission status is correctly detected
- [ ] Denied permissions: Verify app handles gracefully
- [ ] Granted permissions: Verify app recognizes permission

#### 2.2 Permission Request Flow
- [ ] Enable push notifications → Permission prompt appears
- [ ] Grant permission → Settings update successfully
- [ ] Deny permission → Appropriate error message shown
- [ ] System settings change → App reflects new permission state

### 3. Notification Behavior Tests

#### 3.1 Push Notification Settings
- [ ] Push notifications ENABLED + Permission GRANTED → Notifications work
- [ ] Push notifications DISABLED → No notifications received
- [ ] Push notifications ENABLED + Permission DENIED → Warning shown

#### 3.2 Sound & Vibration Settings
- [ ] Sound/vibration ENABLED → Notifications play sound and vibrate
- [ ] Sound/vibration DISABLED → Notifications are silent (no sound/vibration)
- [ ] Test on both foreground and background notifications

### 4. Test Notification Feature

#### 4.1 Test Button Functionality
- [ ] Push notifications ENABLED → Test button visible
- [ ] Push notifications DISABLED → Test button hidden
- [ ] Tap test button → Notification sent within 1 second
- [ ] Test notification respects sound/vibration settings

#### 4.2 Test Notification Content
- [ ] Title: "MedMeister Test"
- [ ] Body: "Dies ist eine Test-Benachrichtigung von MedMeister!"
- [ ] Notification appears in system notification center
- [ ] Tapping notification opens app (if applicable)

### 5. UI/UX Tests

#### 5.1 Settings Screen Layout
- [ ] Push notification toggle displays current state
- [ ] Sound/vibration toggle displays current state
- [ ] Test button appears/disappears based on push setting
- [ ] Loading states shown during setting updates
- [ ] Error handling for failed updates

#### 5.2 Visual Feedback
- [ ] Toggle animations work smoothly
- [ ] Permission warning appears when needed
- [ ] Success/error messages are clear and helpful
- [ ] Settings update immediately in UI

### 6. Platform-Specific Tests

#### 6.1 Web Platform
- [ ] Settings toggles work (save to database)
- [ ] Browser notifications used for test (if supported)
- [ ] No native permission prompts
- [ ] Graceful fallback behavior

#### 6.2 Mobile Platforms (iOS/Android)
- [ ] Native permission prompts work
- [ ] System notification settings respected
- [ ] Background notifications work
- [ ] Sound and vibration work as expected

### 7. Edge Cases & Error Handling

#### 7.1 Network Issues
- [ ] Settings update fails → User sees error message
- [ ] Database unavailable → Graceful degradation
- [ ] Retry mechanism works for failed updates

#### 7.2 Permission Edge Cases
- [ ] Permission revoked in system settings → App detects change
- [ ] Permission granted after denial → App updates correctly
- [ ] Multiple rapid toggle changes → No race conditions

#### 7.3 User State Changes
- [ ] User logs out → Settings reset appropriately
- [ ] User logs in → Settings loaded from database
- [ ] Multiple devices → Settings sync correctly

## Test Execution Steps

### Step 1: Fresh Installation Test
1. Install app on clean device
2. Register new user account
3. Navigate to Settings → Benachrichtigungen
4. Verify default states (both toggles ON)
5. Check database for default values

### Step 2: Permission Flow Test
1. Toggle push notifications OFF then ON
2. Verify permission prompt appears
3. Grant permission
4. Verify test button appears
5. Send test notification
6. Verify notification received with sound/vibration

### Step 3: Sound/Vibration Test
1. Ensure push notifications are enabled
2. Toggle sound/vibration OFF
3. Send test notification
4. Verify notification is silent
5. Toggle sound/vibration ON
6. Send test notification
7. Verify notification has sound/vibration

### Step 4: Persistence Test
1. Change both settings
2. Force close app
3. Reopen app
4. Verify settings maintained
5. Check database values match UI

### Step 5: Error Handling Test
1. Disconnect from internet
2. Try to change settings
3. Verify error message shown
4. Reconnect internet
5. Verify settings can be changed again

## Success Criteria

✅ **Database Integration**: All setting changes persist correctly in Supabase
✅ **Permission Management**: App correctly requests and handles notification permissions
✅ **Notification Behavior**: Notifications respect both push and sound/vibration settings
✅ **Test Feature**: Test notifications work and respect user preferences
✅ **UI/UX**: Settings interface is intuitive and provides clear feedback
✅ **Cross-Platform**: Functionality works on web and mobile platforms
✅ **Error Handling**: App gracefully handles errors and edge cases

## Notes
- Test on multiple devices and OS versions
- Verify accessibility features work with settings
- Check that notification settings don't interfere with other app functionality
- Ensure compliance with platform notification guidelines