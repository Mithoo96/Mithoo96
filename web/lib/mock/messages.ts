import type { Conversation } from "@/lib/types";

export const conversations: Conversation[] = [
  { id: "m01", channel: "email", brand: "gmail", clientId: "c02", name: "Marcus Bell", subject: "Consultation pricing", unread: true, messages: [
    { id: "1", from: "them", text: "Hi! I saw your website. How much is a first consultation, and do you have anything this week?", time: "9:12 AM" },
    { id: "2", from: "ai", text: "Drafted a reply with pricing and three open times. Waiting for your review.", time: "9:13 AM" },
  ] },
  { id: "m02", channel: "sms", brand: "whatsapp", clientId: "c03", name: "Sofia Ramirez", unread: true, messages: [
    { id: "1", from: "me", text: "Hi Sofia, see you today at 10:30 for your check-in.", time: "Yesterday" },
    { id: "2", from: "them", text: "Perfect. Can we also talk about adding a second session each week?", time: "8:41 AM" },
  ] },
  { id: "m03", channel: "social", brand: "instagram", clientId: "c07", name: "Hannah Weiss", unread: true, messages: [
    { id: "1", from: "them", text: "Hey! Is the fall wellness package still available?", time: "8:02 AM" },
    { id: "2", from: "ai", text: "Yes! It's available until Nov 30. Would you like to book a free consultation?", time: "8:02 AM" },
    { id: "3", from: "them", text: "Yes please. Mornings work best.", time: "8:20 AM" },
  ] },
  { id: "m04", channel: "sms", brand: "sms", clientId: "c06", name: "Lucas Martin", unread: true, messages: [
    { id: "1", from: "ai", text: "Hi Lucas, a friendly reminder that invoice #1042 for $480 is past due. You can pay here: pay.smithou.co/1042", time: "Mon" },
    { id: "2", from: "them", text: "Sorry about that. Can I split it into two payments?", time: "7:55 AM" },
  ] },
  { id: "m05", channel: "internal", brand: "internal", name: "Clara Dupont", unread: true, messages: [
    { id: "1", from: "them", text: "Priya hasn't confirmed 3 PM yet. Want me to call her or let Mithoo send a reminder?", time: "9:30 AM" },
  ] },
  { id: "m06", channel: "social", brand: "facebook", clientId: "c14", name: "Mateo Rossi", unread: false, messages: [
    { id: "1", from: "them", text: "Got the consent form. I'll sign it tonight.", time: "Yesterday" },
    { id: "2", from: "me", text: "Thanks Mateo! Let us know if you have any questions.", time: "Yesterday" },
  ] },
  { id: "m07", channel: "email", brand: "gmail", clientId: "c11", name: "Emma Laurent", subject: "Membership renewal", unread: false, messages: [
    { id: "1", from: "me", text: "Hi Emma, your membership renews on the 10th. Would you like to keep the same plan?", time: "Mon" },
    { id: "2", from: "them", text: "Yes, same plan please. Thank you!", time: "Mon" },
  ] },
  { id: "m08", channel: "social", brand: "messenger", clientId: "c12", name: "Ethan Moreau", unread: false, messages: [
    { id: "1", from: "them", text: "Saw your TikTok. What's included in the wellness package?", time: "Sun" },
    { id: "2", from: "ai", text: "It includes 4 sessions, a personal plan and a check-in call. I've sent details by email.", time: "Sun" },
  ] },
  { id: "m09", channel: "internal", brand: "internal", name: "Nadia Haddad", unread: false, messages: [
    { id: "1", from: "them", text: "New social post is in the approval queue. Instagram + Facebook.", time: "Yesterday" },
  ] },
  { id: "m10", channel: "email", brand: "gmail", clientId: "c09", name: "Olivia Brooks", subject: "Intake form", unread: false, messages: [
    { id: "1", from: "ai", text: "Hi Olivia, just a reminder to complete your intake form before your consultation.", time: "Sat" },
  ] },
];

export const cannedReplies = [
  "Thank you, that works for me!",
  "Great, see you then.",
  "Perfect, thanks for the quick reply.",
  "Sounds good. I'll confirm tonight.",
];
