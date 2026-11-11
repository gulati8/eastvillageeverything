# Google Play release runbook: East Village Everything 1.1.0

Everything a person has to do in the Play Console to get the staged Android
build onto Google Play, in order. The agent has already built and verified
the bundle, written the listing and taken the screenshots; what is left is
the part only the account owner can do.

What is staged:

| Thing | Value |
| --- | --- |
| Package | `com.eastvillageeverything.app` |
| Version | 1.1.0, `versionCode` 2 |
| App bundle | `apps/mobile/build-2.aab` (EAS build `ba53f91f-6020-4066-96a3-b4769cc8920d`, target SDK 36, signed with the EAS upload key) |
| Same code as an APK | `apps/mobile/build-2.apk`, installed on the `eve-pixel` emulator |
| Listing text and images | `apps/mobile/fastlane/metadata/android/en-US/`, generated from `docs/app-store/play-listing.md` |
| Developer account | `gulatilabs.me@gmail.com`, "Gulati Labs", id 7467548760272069888, personal account |
| Console | `https://play.google.com/console/developers/7467548760272069888/home` |

Sections 1 to 4 are plan task 2.4. Section 5 hands back to the agent (task
2.6). Sections 6 to 9 are plan task 2.7.

**How the page names were checked.** Each menu path below was checked on
2026-11-10 against Google's Play Console Help, Google's Play Developer API
guide and Expo's submit guide; the source is linked in each section. The
console itself could not be opened past the home page, because the account
is not verified yet, so nothing here was checked against the live screens.
Anything Google's help does not spell out is marked **unconfirmed**; when a
label on screen differs from this file, trust the screen. The page paths are
the confirmed part. Small button names inside a step (for example "Add from
library", "Edit release", "Add app", "Become a tester") are how the console
has worded them before and were not on the help pages read, so treat those
as unconfirmed too.

**One thing that differs from the plan.** Task 2.4 in `scripts/ralph/plan.md`
says "Setup > API access", "link a Google Cloud project" and a "Release
manager" role. That page no longer exists and there is no role by that name.
Section 4 below is the current flow: the service account is made in Google
Cloud Console and then invited as a user in Play Console.

`fastlane run validate_play_store_json_key` has **not** been run: there is no
key yet. It is the first command of task 2.6, after section 4 produces the
key.

## 1. Android device check

Source: <https://support.google.com/googleplay/android-developer/answer/14316361>

Needs a real Android phone: physical, not rooted, Android 10 or later. Any
phone will do, including a borrowed one; the phone's own number is not used
and one phone can verify several accounts. Google's help speaks only of a
physical device, so the `eve-pixel` emulator is not expected to pass
(**unconfirmed**; not tried).

Only the account owner (`gulatilabs.me@gmail.com`) can do this.

1. On the computer, open the console URL above, signed in as
   `gulatilabs.me@gmail.com`.
2. On **Home**, find the task **Verify that you have access to an Android
   mobile device** and click **View details**. A QR code appears.
3. On the phone, scan the QR code. It opens the **Google Play Console** app
   in the Play Store; install it and open it.
4. Sign in to the app as `gulatilabs.me@gmail.com`.
5. Choose the developer account **Gulati Labs**.
6. Tap **Verify** and follow the prompts until it says the device is
   verified.
7. Back on the computer, reload **Home**; the task should be gone or marked
   done.
8. If the phone is not yours: Settings > Passwords & accounts (or Accounts)
   > the `gulatilabs.me@gmail.com` Google account > **Remove account**, then
   uninstall the Play Console app.

## 2. Contact phone number

Source: <https://support.google.com/googleplay/android-developer/answer/10841920>

Cannot start until section 1 is done ("Phone number verification can't
proceed until these prerequisites are met").

1. In the console, click the account menu and open **Manage account >
   Account details** (the help also calls this page **About you**).
2. Go to **Contact details**, the part headed **How Google contacts you**.
3. The +1 646 number already on file should be shown. If the field is empty,
   enter the number in international format, starting with `+1`.
4. Choose text message or voice call, and click **Verify phone number**.
5. Enter the 6-digit code and click **Verify**.
6. Reload **Home**. With both checks passed, **Create app** is enabled.

## 3. Create app

Source: <https://support.google.com/googleplay/android-developer/answer/9859152>

1. **Home** (or **All apps**) > **Create app**.
2. Fill in:

   | Field | Value |
   | --- | --- |
   | App name | `East Village Everything` |
   | Default language | English (United States) – en-US |
   | App or game | App |
   | Free or paid | Free |

   If the dialog also asks for a package name or a contact email
   (**unconfirmed**; Google's help mentions them, Expo's walkthrough of the
   same dialog does not), enter `com.eastvillageeverything.app` and
   `amit@gulatilabs.me`.
3. Declarations at the bottom. Google's help names them without printing
   the checkbox sentences, so the exact wording is **unconfirmed**; what
   each one means:
   - **Developer Program Policies**: you confirm the app follows Google
     Play's Developer Program Policies. True: no ads, no user content, no
     restricted content beyond references to alcohol, which section 6
     declares.
   - **US export laws**: you confirm the app may be exported under US law.
     True: the app's only cryptography is HTTPS provided by the operating
     system, which is exempt. (The iOS listing makes the same declaration.)
   - **Play App Signing Terms of Service**: you accept that Google holds the
     app signing key and re-signs what we upload. This is the plan's
     intent: our key on EAS is only the upload key, so losing it is
     recoverable.
4. Click **Create app**. The app's **Dashboard** opens.
5. Free cannot be changed to paid later; that is fine.

## 4. Service account and JSON key

Sources: <https://developers.google.com/android-publisher/getting_started>,
<https://docs.expo.dev/submit/android/>,
<https://support.google.com/googleplay/android-developer/answer/9844686>

The old **Setup > API access** page is gone, and Google says you no longer
need to link the developer account to a Cloud project. The key is made in
Google Cloud, and the service account is then invited into Play Console like
a person.

In Google Cloud Console (<https://console.cloud.google.com>), signed in as
`gulatilabs.me@gmail.com`:

1. Project picker > **New project**. Name: `eve-play-publishing`. Create it
   and select it.
2. **APIs & Services > Library**, search for **Google Play Android Developer
   API** (Google's own guide calls it "Google Play Developer API"; it is
   the same one), open it and click **Enable**.
3. **IAM & Admin > Service accounts > Create service account**. Name:
   `eve-play-upload`. Click **Create and continue**, skip the optional role
   and user-access steps, and click **Done**.
4. Copy the service account's email address
   (`eve-play-upload@<project-id>.iam.gserviceaccount.com`).
5. Open the service account > **Keys** tab > **Add key > Create new key** >
   **JSON** > **Create**. A `.json` file downloads.
6. Move it into place and check it is ignored by git (it must print the
   path, and `git status` must not list it):

   ```bash
   mv ~/Downloads/<project-id>-*.json apps/mobile/google-play-key.json
   git check-ignore apps/mobile/google-play-key.json
   git status --short
   ```

   Never paste the file's contents anywhere.

In Play Console:

7. **Users and permissions > Invite new users**.
8. Email address: the service account email from step 4.
9. **App permissions** tab > **Add app** > East Village Everything, and tick
   exactly these (names as in Google's help; there is no "Release manager"
   role and **Admin (all permissions)** is not needed):
   - View app information (read-only)
   - Edit and delete draft apps
   - Release apps to testing tracks
   - Manage testing tracks and edit tester lists
   - Manage store presence
   - Release to production, exclude devices, and use Play App Signing
10. **Invite user**, then confirm. The service account should then be in
    the user list; it has no inbox, so there is no invitation to accept
    (**unconfirmed**).
11. Whether a new permission takes time to reach the API is **unconfirmed**
    (no official page says). If the first command in section 5 fails with a
    permission error, run the loop once more before changing anything.
12. On the app's **Dashboard**, look for anything about production access.
    Write one line in `scripts/ralph/progress.txt` saying which of these you
    see:
    - a task to **run a closed test** with a tester count and a day count,
      and **Production** disabled in the left menu: the account is under the
      closed-testing requirement, and section 8 applies;
    - no such task, and **Test and release > Production** opens normally:
      the account has production access, and section 8 is skipped.

## 5. Hand back to the agent

1. In `scripts/ralph/plan.md`, tick task **2.4** (change `- [ ]` to
   `- [x]`). Its check is that `apps/mobile/google-play-key.json` exists and
   that `progress.txt` has the line from step 12 above.
2. From the repo root, run:

   ```bash
   ./scripts/ralph/ralph.sh
   ```

3. The agent does task 2.6: validates the key
   (`fastlane run validate_play_store_json_key`), submits `build-2.aab` to
   the **internal testing** track as a **draft** release with `eas submit`,
   and uploads the title, descriptions, release notes, icon, feature graphic
   and six screenshots with `fastlane supply`.
4. Expo's guide says a manual first upload is optional and `eas submit` can
   create the app's first release. fastlane's guide still says a build must
   have been uploaded once before `supply` works, which the `eas submit`
   step satisfies. If either tool refuses anyway, the agent writes the exact
   message in `progress.txt` and adds a manual upload to task 2.7:
   **Test and release > Testing > Internal testing > Create new release**,
   upload `apps/mobile/build-2.aab`, **Next**, **Save as draft**.
5. When the loop stops, read the 2.6 entry in `progress.txt`, then carry on
   with section 6.

## 6. Console forms

Sources: <https://support.google.com/googleplay/android-developer/answer/9859455>,
<https://support.google.com/googleplay/android-developer/answer/10787469>,
<https://support.google.com/googleplay/android-developer/answer/9859655>,
<https://support.google.com/googleplay/android-developer/answer/9867159>,
<https://support.google.com/googleplay/android-developer/answer/9859673>

All but the last two are under **Monitor and improve > Policy and programs >
App content** (older help pages say "Policy > App content"). Each
declaration has a **Start** or **Start declaration** button, and **Manage**
once filled in. Save each one. The Dashboard's "Set up your app" list links
to the same pages. Do them in any order.

### 6.1 Privacy policy

- URL: `https://eastvillageeverything.nyc/privacy`

### 6.2 App access (the help now also calls it "Sign-in details")

- **All functionality in my app is available without any access
  restrictions.** There is no login.

### 6.3 Ads

- **No, my app does not contain ads.**

### 6.4 Content rating

Steps: **Start** > email > category > questionnaire > **Summary** >
**Submit**.

- Email address: `amit@gulatilabs.me`
- Category (the category names are not published in Google's help, so this
  is **unconfirmed**): choose the one for reference, news or educational
  apps; if there is none that fits a neighborhood guide, choose the one for
  utility, productivity, communication or other.
- Questionnaire. One answer is yes:

  | Question | Answer |
  | --- | --- |
  | Violence, any question | No |
  | Sexuality or nudity, any question | No |
  | Profanity or crude humor | No |
  | References to or depictions of alcohol, tobacco or drugs | **Yes, references to alcohol.** Tags include Happy Hours, Wine Bar and BYOB, and specials describe drink prices |
  | Illegal drugs | No |
  | Tobacco | No |
  | Does the app glamorize or encourage the use of alcohol | No. It lists where bars are and their hours |
  | Gambling: real money, simulated, or references | No |
  | Horror or fear themes | No |
  | Discrimination or hate speech | No |
  | Can users interact or exchange content (chat, user-generated content) | No. All content is published by us |
  | Does the app share the user's location with other users | No. The app never asks for location |
  | Digital purchases; is it a web browser or search engine | No |
  | Promotes or facilitates illegal activity | No |

- Expected result: Teen (ESRB) / PEGI 12 or close to it, from the alcohol
  reference. Accept whatever it computes.

### 6.5 Target audience and content

- Target age: tick **Ages 18 and over** only. Leave **Age 5 and under**,
  **Ages 6-8**, **Ages 9-12**, **Ages 13-15** and **Ages 16-17** unticked.
  With only 18 and over, the Families Policy does not apply.
- An optional checkbox to restrict the app from minors appears. Either
  choice is acceptable for a bar guide; ticking it stops users Google
  determines to be minors from finding or installing the app. Suggested:
  tick it.
- If asked whether the store listing could unintentionally appeal to
  children: **No**.

### 6.6 Data safety

Steps: Overview > **Data collection and security** > **Data types** >
**Data usage and handling** > **Store listing preview** > **Submit**.
Google's help describes the questions without printing them, so the wording
on screen may differ slightly.

Data collection and security:

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (the API and Sentry are HTTPS only) |
| Account creation: which methods does the app support? (**unconfirmed** that this is asked; if it is) | **My app does not allow users to create an account** |
| Do you provide a way for users to request that their data is deleted? | **No** |

Data types: tick exactly three, leave every other type unticked.

| Category | Data type |
| --- | --- |
| App info and performance | Crash logs |
| App info and performance | Diagnostics |
| Device or other IDs | Device or other IDs |

Data usage and handling, the same answers for each of the three:

| Question | Answer |
| --- | --- |
| Collected, shared, or both | **Collected** only. Not shared |
| Is this data processed ephemerally? | **No** |
| Is this data required, or can users choose? | **Data collection is required** (users can't turn it off) |
| Why is this data collected? | **App functionality** only |

Why these are right: the device ID is a random UUID the app makes on first
launch and sends as `X-Device-Id`, used for rate limiting and debugging and
linked to no person; crash logs and diagnostics go to Sentry, which
processes them for us as a service provider, and Google's form does not
count that as sharing. Nothing else leaves the phone: saved places and the
cached list stay in on-device storage, and the app asks for no location.

Check the **Store listing preview**, then **Submit**.

### 6.7 Government apps, Financial features, Health apps, News apps

All four are required even when the answer is no.

| Declaration | Answer |
| --- | --- |
| Government apps | **No**, not developed by or on behalf of a government |
| Financial features | **My app doesn't provide any financial features** |
| Health apps | **My app does not have any health features** |
| News apps | **No**, not a news app |

### 6.8 Advertising ID

- **No**, the app does not use an advertising ID. The manifest does not
  declare `com.google.android.gms.permission.AD_ID`. (The declaration exists
  as a help topic; its on-screen steps are **unconfirmed**.)

If the App content page lists a declaration that is not in 6.1 to 6.8, the
answer for this app is the "no" or "none" option: it has no accounts, no
payments, no ads, no user content, no location and no special permissions
(only `INTERNET`).

### 6.9 Store settings

**Grow users > Store presence > Store settings.**

| Field | Value |
| --- | --- |
| App or game | App |
| Category | Food & Drink |
| Tags (**Manage tags**, optional, up to five from Google's list) | The closest to: Bars, Nightlife, Local guides |
| Contact details: Email | `amit@gulatilabs.me` (shown publicly on the store page) |
| Contact details: Phone | leave empty |
| Contact details: Website | `https://eastvillageeverything.nyc` |

### 6.10 Store listing

**Grow users > Store presence > Store listings** (the default listing,
English (United States)). Task 2.6 uploaded all of this; check it rather
than typing it:

- App name: `East Village Everything`
- Short description:
  `East Village bars and nearby neighborhoods: happy hours, trivia, late nights.`
- Full description: starts "East Village Everything is a guide to the bars
  and late-night spots of the East Village, Manhattan." and ends with the
  support URL.
- App icon (512 x 512), feature graphic (1024 x 500, the name in cream
  italic on dark brown), and six phone screenshots in this order: list,
  neighborhood row open, 11th Street Bar detail, search for "the", filters,
  Saved.

If anything is missing, upload it from
`apps/mobile/fastlane/metadata/android/en-US/` (text files, and
`images/icon.png`, `images/featureGraphic.png`,
`images/phoneScreenshots/`), then **Save**.

## 7. Internal testing

Source: <https://support.google.com/googleplay/android-developer/answer/9845334>

**Test and release > Testing > Internal testing.** Up to 100 testers; no
review wait for this track.

1. **Testers** tab > **Create email list**. List name: `EVE internal`. Add
   `gulatilabs.me@gmail.com` and the Google account signed in on whatever
   Android device will install the app, separated by commas. **Save
   changes**, then **Create**. Tick the list so it is selected for this
   track, and **Save**.
2. **Releases** tab. The draft release for `2 (1.1.0)` made by task 2.6 is
   there. Open it (**Edit release**); release notes should read "Pick a
   neighborhood: tap the title to move between the East Village, the Lower
   East Side and more. Swipe through a place's photos. Search now covers
   every neighborhood."
3. **Next** > **Preview and confirm**. Errors must be fixed (they name the
   missing form from section 6); warnings can be read and passed.
4. **Start rollout** (on some screens **Save and publish**), and confirm.
5. Back on the **Testers** tab, under how testers join, **Copy the shareable
   link**. Google shows the link only once the app's status is
   "Published".
6. Try it one of two ways:
   - On a real Android phone signed in as a tester: open the link, accept,
     install from the Play Store.
   - On the emulator, which already has the same code: `emulator -avd
     eve-pixel` (exports in `apps/mobile/README.md`, Android section) and
     open East Village Everything.
7. Device pass, either way: the list opens on East Village; the title's
   arrow opens the neighborhood row and Lower East Side switches the list;
   a search shows "all neighborhoods"; the filter sheet opens and the back
   button closes it; a place opens with its photo and "street ·
   neighborhood"; a bookmark shows up under Saved; Get directions opens a
   maps app. Also judge the two things noted in the 5.3 entry of
   `progress.txt`: the filter sheet title's font on Android, and the tab
   bar's blur.
8. Anything wrong becomes a `fix(mobile)` task under a new "Phase 6b" in
   `scripts/ralph/plan.md`.

## 8. Closed test and production access (only if the account requires it)

Source: <https://support.google.com/googleplay/android-developer/answer/14151465>

Skip to section 9 if step 12 of section 4 found production access.

The rule, in Google's words: "Developers with personal accounts created
after November 13, 2023, must run a closed test for their app with a
minimum of 12 testers who have been opted in continuously for at least 14
days." Until then **Production** stays disabled. What it means in practice:

- Twelve different Google accounts must each open the opt-in link and
  accept. Internal-testing testers do not count; it has to be the closed
  track.
- Each must stay opted in for 14 days in a row. A tester who leaves and
  rejoins starts their 14 days again, so ask for more than twelve.
- The Dashboard shows the count of opted-in testers and the days so far.

Steps:

1. **Test and release > Testing > Closed testing.** A default track is
   already there (its name, usually "Closed testing - Alpha", is
   **unconfirmed**). Click **Manage track**. (**Create track** would add
   another; not needed.)
2. **Countries / regions** tab > **Add countries / regions** > United
   States, and any country a tester lives in.
3. **Testers** tab > choose **Email** lists > **Create email list**. List
   name: `EVE closed test`. Add the testers' Google account addresses.
   **Save**.
4. **Releases** tab > **Create new release** > **Add from library** and pick
   bundle `2 (1.1.0)` (it is already uploaded; or promote the internal
   release if a **Promote release** button is offered, which is
   **unconfirmed**). Same release notes. **Next** > **Save** > **Send for
   review** from **Publishing overview** if the console asks. The first
   closed release may be reviewed by Google before testers can install it
   (**unconfirmed**).
5. **Testers** tab > **Copy the shareable link** and send it to every
   tester with these instructions: open the link signed in to the Google
   account you gave us, tap **Become a tester**, install the app from the
   Play Store, and do not leave the test.
6. When the Dashboard shows the requirement met, click **Apply for
   production**. The form has three parts (**Next**, **Next**, **Apply**).
   Google's help describes the questions rather than printing them; the
   prompts are below with room for the answers. Drafts are given where the
   answer is a fact about the app; the ones about the test can only be
   written after it.

   Part 1, about your closed test:

   - How easy was it to recruit testers? (pick one of the options)

     Your answer:

   - Tester engagement: did testers use all the features? Was their usage
     what you expect from production users?

     Your answer:

   - Summary of the feedback you received, and how you collected it.

     Your answer:

   Part 2, about your app:

   - Who is the intended audience?

     Draft: Adults 18 and over who live in or visit downtown Manhattan and
     want to find a bar for tonight.

     Your answer:

   - How does the app provide value to users?

     Draft: It is a hand-edited guide to about 250 bars and late-night
     spots in the East Village and the neighborhoods next to it, with
     current happy hours, hours, specials and what each place is good for.
     It needs no account, shows no ads and works without a signal.

     Your answer:

   - Estimated installs in the first year (pick a range).

     Your answer:

   Part 3, production readiness:

   - What changes did you make based on the closed test?

     Your answer:

   - How did you decide the app is ready for production?

     Draft: The same code has been live on the App Store since 1.0.0 and
     passed a scripted device pass on Android before the test (launch,
     neighborhood switching, search, filters, detail, saved places,
     offline); the closed test found no crashes.

     Your answer:

7. **Apply.** Google reviews the application and emails the account owner
   the result.

## 9. Promote to production

Sources: <https://support.google.com/googleplay/android-developer/answer/9859348>,
<https://support.google.com/googleplay/android-developer/answer/9859654>

1. **Test and release > Production.**
2. **Countries / regions** tab > **Add countries / regions** > United
   States. (The app is in English and about Manhattan; more countries can
   be added later.) Save.
3. **Releases** tab > **Create new release** > **Add from library** > bundle
   `2 (1.1.0)`. If the testing track's release page offers **Promote
   release > Production** instead, that does the same thing
   (**unconfirmed**; the button is in Expo's guide, not Google's).
4. Release name: leave the default `2 (1.1.0)`. Release notes, en-US: "Pick
   a neighborhood: tap the title to move between the East Village, the Lower
   East Side and more. Swipe through a place's photos. Search now covers
   every neighborhood."
5. **Next**. Fix any errors; they name the form that is incomplete.
6. **Start rollout to production**. A first release always goes to
   everyone; "Rollout percentage options are unavailable for a first
   release."
7. Open **Publishing overview**. If changes are listed as not yet sent,
   click **Send for review**. With managed publishing off (the default) the
   app goes live by itself when Google approves it; with **Turn on managed
   publishing** it waits under **Changes ready to publish** for you to click
   **Publish changes**.
8. When the app is live, the store page is
   `https://play.google.com/store/apps/details?id=com.eastvillageeverything.app`.
   Tick task 2.7 in `scripts/ralph/plan.md`, or write each problem as a
   `fix(mobile)` task under a new "Phase 6b".
