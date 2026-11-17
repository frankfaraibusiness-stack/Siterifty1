// Single source of truth for the Help Center questions and answers (/help).
// Edit the text here. Plan names, prices and limits are NOT typed in this
// file: they are read from lib/plans.js, so they can never go out of date.
//
// Answer text supports **bold** and [label](/path) links (see rich.js).
// Keep every answer true to how the site really works today.
import { usdToken } from "@/lib/currency";
import { FREE_WHILE_TESTING, LIMIT_GROUPS, PLANS } from "@/lib/plans";
import { LEGAL, NOT_AFFILIATED, SITE } from "@/lib/site";

const free = PLANS[0];
const paid = PLANS.slice(1);
// One cell of the plan comparison table (lib/plans.js), by row label and plan number.
const cell = (label, i) => LIMIT_GROUPS.flatMap((g) => g.rows).find((r) => r[0] === label)?.[1][i];

const planList = PLANS.map((p) => `${p.name} (${p.price === 0 ? "free" : `${usdToken(p.price)} a month`})`).join(", ");

export const HELP_GROUPS = [
  {
    id: "start",
    title: "Getting started",
    icon: "star",
    blurb: "What GTA6FanBase is and how to find your feet.",
    items: [
      {
        q: `What is ${SITE.name}?`,
        a: `${SITE.summary} You can post photos, video clips, polls and theories, share short stories, join communities for every corner of the GTA 6 world, and follow other fans.`,
      },
      {
        q: "Is GTA6FanBase official? Is it run by Rockstar Games?",
        a: [
          `No. ${NOT_AFFILIATED.long}`,
          "Read the full [fan site disclaimer](/disclaimer) for what that means for you.",
        ],
      },
      {
        q: "Do I need an account to look around?",
        a: "No. You can read the public feed, open public posts and browse communities without an account. You need an account to post, comment, like, vote, save, join communities, change settings or message us from your profile.",
      },
      {
        q: "How do I create an account?",
        a: [
          "Choose the sign up option in the top menu and pick a **username**, add your **email** and set a **password**. You can also continue with Google.",
          `Usernames are 3 to 20 characters long and can use letters, numbers, dots and underscores. Passwords must be at least 6 characters, and longer is safer. You must be at least ${LEGAL.minAge} years old.`,
        ],
      },
      {
        q: "Is it free?",
        a: FREE_WHILE_TESTING
          ? `Yes. ${free.name} is free forever, and while we test, every other plan is free to switch to as well. See [plans and pricing](/about#plans) for what each plan includes.`
          : `Yes. ${free.name} is free forever. Paid plans are optional. See [plans and pricing](/about#plans).`,
      },
    ],
  },
  {
    id: "account",
    title: "Account and logging in",
    icon: "user",
    blurb: "Passwords, usernames, profile details and your data.",
    items: [
      {
        q: "I forgot my password. What do I do?",
        a: "Open the log in window and choose the forgot password option. Enter the email on your account and we send a reset link through our sign-in provider. If nothing arrives, check your spam folder and make sure you used the same email you signed up with.",
      },
      {
        q: "How do I change my password?",
        a: "Go to [Settings](/settings), open your account panel and use the password option. You will need your current password.",
      },
      {
        q: "How do I change my name, bio or profile picture?",
        a: "Open your profile and choose edit profile. You can change your display name, bio, location, website, profile picture and banner. Your **username** is how people find and mention you.",
      },
      {
        q: "How long do I stay logged in?",
        a: "Up to 5 days on the same browser, or until you log out. You can log out from the side menu. Log out on shared computers.",
      },
      {
        q: "Can I download a copy of my data?",
        a: "Yes. In [Settings](/settings) you can download a JSON file with your account details, profile, settings and the text of your posts. Photos and profile pictures are left out of the file to keep it small.",
      },
      {
        q: "How do I delete my account?",
        a: `There is no delete button yet. [Send us a privacy request](/contact?topic=privacy) from the email on your account, tell us your username and we will deal with it, aiming to reply within ${LEGAL.responseDays} days. See the [Privacy Policy](/privacy) for what is removed.`,
      },
    ],
  },
  {
    id: "posting",
    title: "Posting and comments",
    icon: "image",
    blurb: "Photos, clips, polls, theories and everything around them.",
    items: [
      {
        q: "What can I post?",
        a: [
          "Five formats: a **photo post** (screenshots, fan art, map finds), a **video clip** (upload a file or link a YouTube video), a **poll**, a **theory** where you lay out your evidence and rate your confidence so the community can vote on it, and an **event** with a date, time, meeting spot and map pin, plus control over who can join and who can see it.",
          "Start from the create button or the quick post tiles on the home page.",
        ],
      },
      {
        q: "How many photos or how long a video can I upload?",
        a: `It depends on your plan. ${free.name} allows ${cell("Photos per post", 0)} photos per post and video uploads up to ${cell("Upload size", 0)} and ${cell("Clip length", 0)}. Higher plans raise those limits. The full table is in the [plans section](/about#plans).`,
      },
      {
        q: "Can I schedule a post for later?",
        a: "Yes. When you create a post you can pick a date and time for it to go live. How far ahead you can schedule depends on your plan.",
      },
      {
        q: "Why is my post covered or blurred?",
        a: "Posts marked as spoilers or leaks are covered so people can choose whether to look. You can change how spoilers show in your feed from [Settings](/settings): covered, shown or hidden. If you post a leak, mark it as one. See the [Community Guidelines](/guidelines).",
      },
      {
        q: "Why do my uploaded photos have the GTA6FanBase logo on them?",
        a: `Photos in posts carry the ${SITE.name} logo, so copies that are downloaded or screenshotted show where they came from. The logo does not change who owns your photo. See [Copyright and DMCA](/copyright).`,
      },
      {
        q: "I lost my half-written post. Can I get it back?",
        a: "While autosave is on, the text of an unfinished post is saved on your device and comes back next time you open the composer. Photos and videos are not saved. Clearing your browser data removes the draft. You can turn autosave off in [Settings](/settings).",
      },
      {
        q: "How do I delete my own post or comment?",
        a: "Open your post and use the delete option in its menu. Only you (and our moderators when needed) can remove your content.",
      },
      {
        q: "What is a pinned comment?",
        a: "Members on a paid plan have their comments pinned above the others for a limited time after posting. The time depends on the plan and is shown with the comment. Pinned comments follow the same [rules](/guidelines) as every other comment.",
      },
    ],
  },
  {
    id: "stories",
    title: "Stories",
    icon: "camera",
    blurb: "Short photos and clips that disappear.",
    items: [
      {
        q: "What is a story?",
        a: "A quick photo or short video clip that appears in the stories row at the top of the home page, with an optional short caption. Stories expire automatically.",
      },
      {
        q: "How long does a story stay up and how long can it be?",
        a: `On ${free.name}, you can have ${cell("Stories live at once", 0)} stories up at once, each clip can be up to ${cell("Story video length", 0)} and a story stays up for ${cell("Story stays up for", 0)}. Higher plans allow more stories at once, longer clips and a longer life. See the [plans table](/about#plans).`,
      },
      {
        q: "Can I hide the stories row?",
        a: "Yes. In [Settings](/settings), your feed options let you hide stories (and the quick post box) from your home page.",
      },
    ],
  },
  {
    id: "communities",
    title: "Communities",
    icon: "users",
    blurb: "Join, create and run a GTA 6 community.",
    items: [
      {
        q: "What are communities?",
        a: "Communities are spaces for one corner of GTA 6, such as trailers, the map, theories, cars or fan art. Every community has its own rules, a flair for each post and its own members. Everything must be about GTA 6.",
      },
      {
        q: "How do I join one?",
        a: "Open the [Communities](/communities) tab, pick one and press join. Some communities ask a few questions first and a moderator approves you.",
      },
      {
        q: "How do I start my own community?",
        a: "Go to the [Communities](/communities) tab and choose create. A short wizard walks you through the name, topic, colours, rules, who can post and any join questions. Communities must stay about GTA 6.",
      },
      {
        q: "What can community owners and moderators do?",
        a: "Owners and admins set the rules and permissions (who can post, links, images, leak policy, slow mode and a wait for new members). Moderators help review join requests and keep posts on topic. Staff can remove posts and members who break the rules.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings, privacy and safety",
    icon: "gear",
    blurb: "Control who sees what and what shows up for you.",
    items: [
      {
        q: "How do I make my account private?",
        a: "Open [Settings](/settings) and switch on a private account. You can also choose whether your posts are always public, always private, or whether we ask you every time you post.",
      },
      {
        q: "How do I block someone or mute words?",
        a: "In [Settings](/settings) you can add usernames to your block list and add words you never want to see. Posts containing muted words are hidden from your feed.",
      },
      {
        q: "Can I stop people from commenting on my posts?",
        a: "Yes. You can turn comments off, or limit who can comment, in your content and safety settings. You can also hide like counts and decide whether others can share your posts.",
      },
      {
        q: "How do I change the site colours?",
        a: "[Settings](/settings) has a City Look panel for site colours, glow, text size and reduced motion. Your choice is remembered in a cookie on your device so every page opens the way you set it.",
      },
      {
        q: "How do I report a post, a person or a community?",
        a: "[Send us a report](/contact?topic=report) and paste the link to what you are reporting, so we can find it fast. Tell us what is wrong. Reports are read by people, and we may remove content or limit accounts that break the [Community Guidelines](/guidelines).",
      },
      {
        q: "My post or account was limited. Can I appeal?",
        a: "Yes. [Send us an appeal](/contact?topic=appeal) with your username and what was removed or limited, and why you think it should be reviewed.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans and pricing",
    icon: "star",
    blurb: "What each plan does. The numbers here are read live from our plans list.",
    items: [
      {
        q: "What plans are there and what do they cost?",
        a: `${planList}. ${
          FREE_WHILE_TESTING
            ? "We are testing, so switching to any plan costs nothing right now and asks for no payment details."
            : "Paid plans are billed monthly."
        }`,
      },
      {
        q: "What do paid plans add?",
        a: [
          `Higher limits (more photos per post, longer video, more stories, longer scheduling), profile themes and badges, comments pinned on top for a while, and the ${SITE.name} logo badge on your comments.`,
          `${paid.map((p) => `**${p.short}**: ${p.tagline}`).join(" ")}`,
        ],
      },
      {
        q: "How do I change my plan?",
        a: "Log in and open the [Upgrade](/upgrade) page from the side menu. Choose a plan and it applies straight away. Choosing the free plan puts you back on it. Nothing you posted is removed when you move to a lower plan.",
      },
      {
        q: "Does a paid plan make my content more official?",
        a: `No. Badges show your plan. They do not mean ${SITE.name} or anyone else has checked your claims, and they do not give you any connection to Rockstar Games.`,
      },
    ],
  },
  {
    id: "fix",
    title: "Troubleshooting",
    icon: "bolt",
    blurb: "When something does not look or work right.",
    items: [
      {
        q: "A page will not load or looks broken. What should I try?",
        a: "Refresh the page, then try a different browser or a private window. Update your browser, turn off extensions that block scripts for this site, and check your connection. If it keeps happening, [tell us](/contact?topic=bug) which page, what you did and what device and browser you use.",
      },
      {
        q: "I cannot log in.",
        a: "Check you are using the email you signed up with and the right password. Use the forgot password option if needed. If you signed up with Google, use the Continue with Google button instead. Still stuck? [Contact us](/contact?topic=account).",
      },
      {
        q: "My video will not upload.",
        a: "Check the file type (MP4, MOV or WebM) and the size and length limits of your plan on the [plans table](/about#plans). Large files on slow connections can take a while. Keep the tab open until it finishes.",
      },
      {
        q: "Voice search is not working.",
        a: "Voice search uses your browser's built-in speech recognition and needs microphone permission. It is not available in every browser. If the microphone button is missing or does nothing, type your search instead.",
      },
      {
        q: "How do I report a bug or suggest a feature?",
        a: "Use the [contact form](/contact?topic=bug). Tell us what happened, where, and on which device. Ideas are welcome too.",
      },
    ],
  },
];

export const HELP_TOTAL = HELP_GROUPS.reduce((n, g) => n + g.items.length, 0);
