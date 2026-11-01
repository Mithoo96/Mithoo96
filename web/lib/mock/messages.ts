import type { Conversation } from "@/lib/types";

export const conversations: Conversation[] = [
  { id: "m01", channel: "facebook", clientId: "c03", name: "Kevin Charles", unread: true, messages: [
    { id: "1", from: "them", text: "Hi, I filled out the form on your ad. How much would a 20-year term policy cost for me? I'm 34.", time: "9:20 AM" },
    { id: "2", from: "ai", text: "Thanks Kevin! Rates depend on a few health questions. Moise's team can give you exact numbers on a 15-minute call. Does tomorrow at 9:30 work?", time: "9:21 AM" },
  ] },
  { id: "m02", channel: "whatsapp", clientId: "c01", name: "Jean Pierre", unread: true, messages: [
    { id: "1", from: "ai", text: "Bonjou Jean, a friendly reminder that we still need your W-2 and 1099 to start your return. You can upload them here: docmoise.link/up/c01", time: "Mon" },
    { id: "2", from: "them", text: "Mèsi. My employer said the W-2 comes next week. Can I send the 1099 first?", time: "8:12 AM" },
  ] },
  { id: "m03", channel: "email", clientId: "c06", name: "Tamika Johnson", subject: "Beneficiary question", unread: true, messages: [
    { id: "1", from: "them", text: "Can I list both of my daughters as beneficiaries on the final expense policy? One of them is still a minor.", time: "8:45 AM" },
  ] },
  { id: "m04", channel: "instagram", clientId: "c19", name: "Rose-Marie Toussaint", unread: true, messages: [
    { id: "1", from: "them", text: "Hello! Do you do taxes for people with a small hair business at home?", time: "7:58 AM" },
    { id: "2", from: "ai", text: "Yes! We prepare Schedule C returns for home businesses all the time. I booked you a free consultation today at 4:00 PM.", time: "7:59 AM" },
    { id: "3", from: "them", text: "Perfect, see you then 🙏", time: "8:03 AM" },
  ] },
  { id: "m05", channel: "internal", name: "Claudette Remy", unread: true, messages: [
    { id: "1", from: "them", text: "Ricardo's business return is ready for your final review. I flagged one depreciation question.", time: "9:40 AM" },
  ] },
  { id: "m06", channel: "sms", clientId: "c20", name: "Jamal Carter", unread: false, messages: [
    { id: "1", from: "me", text: "Hi Jamal, your Living Benefits application just needs your e-signature. Link: docmoise.link/sign/c20", time: "Yesterday" },
    { id: "2", from: "them", text: "Will do tonight after work.", time: "Yesterday" },
  ] },
  { id: "m07", channel: "email", clientId: "c05", name: "Ricardo Alvarez", subject: "Business return question", unread: false, messages: [
    { id: "1", from: "them", text: "Do you need the receipts for the van I bought in March?", time: "Mon" },
    { id: "2", from: "me", text: "Yes please, the purchase invoice is enough. We'll handle the depreciation.", time: "Mon" },
  ] },
  { id: "m08", channel: "whatsapp", clientId: "c10", name: "Fabiola Celestin", unread: false, messages: [
    { id: "1", from: "ai", text: "Hi Fabiola, we only need a photo of your Social Security card to start your return.", time: "Yesterday" },
    { id: "2", from: "them", text: "Ok I will look for it this weekend", time: "Yesterday" },
  ] },
  { id: "m09", channel: "facebook", clientId: "c22", name: "Michael Thompson", unread: false, messages: [
    { id: "1", from: "them", text: "Saw your post about final expense. Do you need a medical exam?", time: "Sun" },
    { id: "2", from: "ai", text: "Many final expense plans need no exam, just a few health questions. Jonathan will call you today.", time: "Sun" },
  ] },
  { id: "m10", channel: "internal", name: "Tasha Morgan", unread: false, messages: [
    { id: "1", from: "them", text: "Life insurance lead campaign is in the approval queue. $300 budget.", time: "Yesterday" },
  ] },
];

export const cannedReplies = ["Thank you so much!", "Okay, that works for me.", "Perfect, I'll send it today.", "Great, talk soon."];
