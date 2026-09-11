/* =====================================================================
   Italy Gateway — Site Chat Assistant (chatbot.js)
   Self-contained floating chat widget: quick FAQs + keyword bot,
   escalates to WhatsApp when needed. No backend required.
   ===================================================================== */
(function(){
  "use strict";

  var PREFIX = location.pathname.indexOf("/services/") !== -1 ? "../" : "";
  var WA_NUMBER = "201011318575";
  var SESSION_KEY = "igchatTeaserShown";
  var GAS_URL = "https://script.google.com/macros/s/AKfycbzFL3tFzMgv9Vh2YRRRZctrlOUoLQUYmaz2Mt2SoeNuWk6AHtoYO1yBXyDpX9vzd5XDFQ/exec";
  var CONV_KEY = "igchatConversationId";
  var LIVECHAT_KEY = "igchatLiveActive";
  var conversationId = localStorage.getItem(CONV_KEY) || null;
  var liveChatActive = localStorage.getItem(LIVECHAT_KEY) === "1";
  var renderedChatRows = {};
  var chatBanned = false;
  var bannedNoteShown = false;
  var banWatchTimer = null;
  var isInitialSync = false;
  var sentTexts = [];
  var visibleLog = [];
  var chatPollTimer = null;
  var inactivityCloseTimer = null;
  var INACTIVITY_CLOSE_MS = 2 * 60 * 1000;
  var lastVisitorLang = null;
  var VISITOR_NAME_KEY = "igchatVisitorName";
  var visitorName = localStorage.getItem(VISITOR_NAME_KEY) || null;
  var pendingHandoff = null;
  var hydrated = false;
  var intakeState = null;
  var aiChatState = null;

  function lang(){
    return localStorage.getItem("siteLang") || "en";
  }

  /* ---------- Knowledge base ---------- */
  var T = {
    en: {
      brand: "Italy Gateway",
      subtitle: "Available 24/7 • usually replies within minutes",
      teaser: "Hi! I'm Marco 👋 Need help with your Italy visa journey? Chat with us!",
      placeholder: "Type your question…",
      send: "Send",
      quickTitle: "Quick questions",
      qServices: "Our services",
      qPrices: "Consultation prices",
      qSchengen: "Schengen visa requirements",
      qFaq: "Frequently asked questions",
      qAgent: "Talk to customer service",
      greeting: "Welcome to Italy Gateway! 👋 I'm Marco, your smart assistant — here to help you make the most of our visa guidance, day or night. Ask me about visa types, prices, or how to book a consultation, or tap a quick question below.",
      fallback: "I'm not fully sure about that one — want me to transfer you to our customer service team?",
      thanks: "You're welcome! 🌸 Anything else I can help with?",
      bye: "Take care! Feel free to come back anytime you have a question. 🇮🇹",
      humanHandoff: "Sure — I'm transferring you to our customer service team now. They'll reply right here in this chat as soon as possible 💬",
      askName: "Great — before we continue, could you tell me your name?",
      liveChatWelcomeBack: "Welcome back! You're still connected with our customer service team — your conversation continues below.",
      chatClosedNote: "This conversation has ended. 👋 We're here all day if you need anything else.\nThanks for choosing Italy Gateway ❤️",
      chatBannedNote: "You have been permanently blocked from this chat by our support team. If you think this is a mistake, please reach out to us through another channel.",
      chatBannedTitle: "Chat locked",
      chatUnbannedNote: "Good news — you've been unblocked! Feel free to reach out again, we're happy to help.",
      closeContinue: "Continue conversation",
      closeRate: "Rate our support",
      continueTriggerMsg: "I'd like to continue the conversation, please.",
      rateFive: "⭐️⭐️⭐️⭐️⭐️ Excellent",
      rateOne: "⭐️ Not satisfied",
      rateThanks: "Thanks so much for your feedback! 🙏",
      fileHandoffReply: "Got it — thanks for sending that over, I'll take a look and follow up here shortly.",
      fileTooBig: "This file is too large (max 5MB). Please choose a smaller file.",
      servicesList: "Here's what we help with:\n🎓 Study Visa — university admission, enrollment documents, financial proof and accommodation.\n✈️ Tourism Visa — Schengen tourism visa requirements and documents.\n💼 Work Visa — the work visa (Nulla Osta) pathway to Italy.\n👨‍👩‍👧 Family Reunification — requirements and process.\n📋 Document Preparation & Review — professional review of your paperwork.\n📅 Personal Consultation — a one-on-one session about your specific case.",
      pricesList: "Consultation prices:\n🏢 In-person (60 min) — $150\n🎥 Video call (60 min) — $75\n🎧 Voice call (60 min) — $50\n\nThese are for one-on-one consultations. Browsing the guide itself is always free.",
      schengenInfo: "For a Schengen tourism visa we help you understand the required documents and process — passport, financial proof, accommodation booking, travel insurance, and the application steps with VFS Global. Want a personal consultation to review your specific case?",
      studyInfo: "For a Study Visa we guide you through university admission requirements, enrollment documents, proof of financial means and accommodation arrangements for Italy.",
      workInfo: "For a Work Visa we provide general guidance on the Nulla Osta work permit pathway to Italy — the employer's role, required steps, and timing.",
      familyInfo: "For Family Reunification we help you understand the eligibility requirements and the steps to bring your family members to Italy.",
      docsInfo: "We offer professional review and organization of your required documentation — making sure everything is complete and correctly prepared before you submit.",
      bookingInfo: "You can book a one-on-one consultation (in-person, video or voice) from the \"Book a Consultation\" page — just pick a type and we'll confirm your appointment on WhatsApp.",
      contactInfo: "You can reach us by email at ahmedeltayb372@gmail.com, on WhatsApp, or via our Facebook page — all linked in the Contact section of the site.",
      faq1: "No — this is an independent informational guide and consultation service, not affiliated with any embassy, consulate or VFS Global. Always verify sensitive details (dates, fees, documents) with the official source.",
      faq2: "Not at all — the guide is free to browse with no sign-up required.",
      faq5: "Yes, browsing the guide and general information is 100% free. Personal consultations are discussed directly with you.",
      faq6: "Always confirm official requirements, fees and timelines on the VFS Global or Italian Embassy website — this guide is for informational support only.",
      complaintIntake: "I'm sorry to hear that 🙏 Could you tell me exactly what happened?",
      requestIntake: "Sure, tell me exactly what you'd like to request and I'll pass it on to our team.",
      intakeMoreQuestion: "Got it. Anything else you'd like to add before I send this to our team?",
      intakeDoneLabel: "No, that's everything ✅",
      intakeAddMoreLabel: "Yes, one more thing",
      intakeClosing: "Thanks — got everything I need, I'll follow up with you here shortly 💬",
      complaintLabel: "📩 New complaint",
      requestLabel: "📩 New request"
    },
    ar: {
      brand: "بوابة إيطاليا",
      subtitle: "متاحين على مدار الساعة • بنرد عادةً خلال دقايق",
      teaser: "أهلاً! أنا ماركو 👋 محتاج مساعدة في رحلة تأشيرتك لإيطاليا؟ كلمنا!",
      placeholder: "اكتب سؤالك…",
      send: "إرسال",
      quickTitle: "أسئلة سريعة",
      qServices: "خدماتنا",
      qPrices: "أسعار الاستشارات",
      qSchengen: "شروط تأشيرة الشنجن",
      qFaq: "أسئلة شائعة",
      qAgent: "تواصل مع خدمة العملاء",
      greeting: "أهلاً بيك في بوابة إيطاليا! 👋 أنا ماركو، مساعدك الذكي هنا، وموجود على مدار الساعة عشان أساعدك تستفيد من خدماتنا. اسألني عن أنواع التأشيرات، الأسعار، أو إزاي تحجز استشارة — أو دوس على سؤال سريع تحت.",
      fallback: "مش متأكد إني فاهم سؤالك بالظبط — تحب أحولك لفريق خدمة العملاء؟",
      thanks: "العفو! 🌸 محتاج حاجة تانية؟",
      bye: "ربنا معاك! ارجعلنا في أي وقت لو عندك سؤال. 🇮🇹",
      humanHandoff: "تمام، هحولك دلوقتي لفريق خدمة العملاء، وهيردوا عليك هنا في نفس الشات في أقرب وقت 💬",
      askName: "تمام، قبل ما نكمل، ممكن أعرف اسمك؟",
      liveChatWelcomeBack: "أهلاً بيك تاني! لسه متصل بفريق خدمة العملاء — المحادثة بتاعتك مكملة تحت.",
      chatClosedNote: "يرجى العلم إنه تم إنهاء الشات تلقائيًا لعدم وجود رد خلال دقيقتين، لكن إحنا موجودين طول اليوم لمساعدتك 😊\nلتكملة المحادثة اضغط على \"متابعة المحادثة\".\nولتقييم أسلوبي، اضغط على \"تقييم ممثل خدمة العملاء\" وهيظهرلك في خلال دقيقة واختار:\n\"خمس نجوم\" إذا كنت راضي، أو \"نجمة واحدة\" إذا كنت غير راضي.\nتقييمك بيساعدنا نحسّن الخدمة ونقدملك الأفضل.\nشكرًا لاختيارك Italy Gateway ❤️",
      chatBannedNote: "تم حظرك نهائيًا من هذه المحادثة بواسطة خدمة العملاء. لو حاسس إن ده حصل غلط، تقدر تتواصل معانا من طريقة تانية.",
      chatBannedTitle: "المحادثة مقفولة",
      chatUnbannedNote: "تم فك الحظر عنك! تقدر تتواصل معانا تاني، إحنا موجودين لمساعدتك.",
      closeContinue: "متابعة المحادثة",
      closeRate: "تقييم ممثل خدمة العملاء",
      continueTriggerMsg: "عايز أكمل المحادثة من فضلك",
      rateFive: "⭐️⭐️⭐️⭐️⭐️ ممتاز",
      rateOne: "⭐️ مش راضي",
      rateThanks: "شكرًا جدًا لتقييمك! 🙏",
      fileHandoffReply: "تمام، وصلني الملف، هراجعه وأرد عليك هنا في أقرب وقت.",
      fileTooBig: "الملف ده كبير أوي (الحد الأقصى 5 ميجا). جرب ملف أصغر.",
      servicesList: "دي الخدمات اللي بنساعد فيها:\n🎓 تأشيرة الدراسة — القبول الجامعي، مستندات التسجيل، الإثبات المالي والسكن.\n✈️ تأشيرة السياحة — متطلبات ومستندات تأشيرة شنغن.\n💼 تأشيرة العمل — مسار تأشيرة العمل (Nulla Osta) لإيطاليا.\n👨‍👩‍👧 لمّ الشمل — المتطلبات والإجراءات.\n📋 تجهيز ومراجعة المستندات — مراجعة احترافية لأوراقك.\n📅 استشارة شخصية — جلسة فردية لمناقشة حالتك.",
      pricesList: "أسعار الاستشارات:\n🏢 حضورية (60 دقيقة) — 150$\n🎥 فيديو (60 دقيقة) — 75$\n🎧 صوتية (60 دقيقة) — 50$\n\nدي أسعار الاستشارات الفردية. تصفح الدليل نفسه مجاني دايمًا.",
      schengenInfo: "بالنسبة لتأشيرة شنغن السياحية بنساعدك تفهم المستندات المطلوبة والإجراءات — الباسبور، الإثبات المالي، حجز السكن، تأمين السفر، وخطوات التقديم عبر VFS Global. تحب تحجز استشارة شخصية لمراجعة حالتك بالتفصيل؟",
      studyInfo: "بالنسبة لتأشيرة الدراسة بنوجّهك في متطلبات القبول الجامعي، مستندات التسجيل، إثبات الإمكانيات المالية وترتيبات السكن في إيطاليا.",
      workInfo: "بالنسبة لتأشيرة العمل بنقدّم إرشاد عام عن مسار تصريح العمل (Nulla Osta) لإيطاليا — دور صاحب العمل، الخطوات المطلوبة، والتوقيت.",
      familyInfo: "بالنسبة للمّ الشمل بنساعدك تفهم شروط الأهلية وخطوات جلب أفراد أسرتك لإيطاليا.",
      docsInfo: "بنقدّم مراجعة احترافية وتنظيم لمستنداتك المطلوبة — عشان نتأكد إن كل حاجة كاملة ومجهزة صح قبل التقديم.",
      bookingInfo: "تقدر تحجز استشارة فردية (حضورية، فيديو، أو صوتية) من صفحة \"احجز استشارة\" — اختار النوع وهنأكدلك الميعاد على واتساب.",
      contactInfo: "تقدر توصلنا عن طريق الإيميل ahmedeltayb372@gmail.com، أو واتساب، أو صفحتنا على فيسبوك — كل الروابط موجودة في قسم التواصل بالموقع.",
      faq1: "لأ، ده دليل معلوماتي وخدمة استشارية مستقلة، مش تابع لأي سفارة أو قنصلية أو VFS Global. دايمًا تأكد من التفاصيل الحساسة (مواعيد، رسوم، مستندات) من المصدر الرسمي.",
      faq2: "لأ خالص، الدليل متاح مجانًا من غير أي تسجيل.",
      faq5: "أيوه، تصفح الدليل والمعلومات العامة مجاني 100%. الاستشارات الشخصية بنتناقش فيها معاك مباشرة.",
      faq6: "دايمًا تأكد من المتطلبات والرسوم والمواعيد الرسمية من موقع VFS Global أو السفارة الإيطالية — الدليل ده لدعم معلوماتي بس.",
      complaintIntake: "مضايقني إني اسمع كده 🙏 ممكن تقولي بالظبط إيه اللي حصل؟",
      requestIntake: "تمام، قولّي طلبك بالظبط وأنا هوصله لفريقنا.",
      intakeMoreQuestion: "تمام، فهمت. في حاجة تانية حابب تضيفها قبل ما أبعت التفاصيل دي لفريقنا؟",
      intakeDoneLabel: "لأ، كده تمام ✅",
      intakeAddMoreLabel: "أيوه، في حاجة كمان",
      intakeClosing: "تمام، خدت كل التفاصيل، هتابع معاك هنا في أقرب وقت 💬",
      complaintLabel: "📩 شكوى جديدة",
      requestLabel: "📩 طلب جديد"
    }
  };

  /* ---------- Keyword topics (checked in order, first match with score>0 wins) ---------- */
  function topics(){
    return [
      { id:"thanks", kw:["شكرا","متشكر","تسلم","thanks","thank you","thx"], reply:function(t){ return t.thanks; } },
      { id:"bye", kw:["مع السلامة","باي","تصبح على خير","bye","goodbye","see you"], reply:function(t){ return t.bye; } },
      { id:"agent", kw:["خدمه العملاء","خدمة العملاء","عايز حد","اتكلم مع حد","مسئول","ممثل","human","agent","representative","customer service","real person","حد يرد"], reply:function(t){ return t.humanHandoff; }, handoff:true },
      { id:"complaint", kw:["شكوى","شكوة","شكوي","complaint","عندي مشكلة","عندى مشكلة","في مشكلة","فى مشكلة","مش راضي","مش راضى","مقتنعش","عايز اشتكي","عايز اشتكى","i have a problem","i want to complain"], reply:function(t){ return t.complaintIntake; }, intake:true },
      { id:"request", kw:["عندي طلب","عندى طلب","عايز اقدم طلب","عايز افتح طلب","عاوز اقدم طلب","محتاج اطلب حاجة","طلب خاص","special request","file a request","make a request","i have a request","i'd like to request"], reply:function(t){ return t.requestIntake; }, intake:true },
      { id:"prices", kw:["سعر","اسعار","السعر","الاسعار","تكلفه","تكلفة","فلوس","بكام","price","prices","cost","how much","fees"], reply:function(t){ return t.pricesList; } },
      { id:"schengen", kw:["شنجن","شنغن","سياحه","سياحة","tourist","tourism","schengen"], reply:function(t){ return t.schengenInfo; } },
      { id:"study", kw:["دراسه","دراسة","جامعه","جامعة","طالب","study","university","student"], reply:function(t){ return t.studyInfo; } },
      { id:"work", kw:["عمل","شغل","وظيفه","وظيفة","nulla osta","work visa","job"], reply:function(t){ return t.workInfo; } },
      { id:"family", kw:["لم الشمل","لمّ الشمل","اسره","اسرة","عائله","عائلة","family reunification","family"], reply:function(t){ return t.familyInfo; } },
      { id:"docs", kw:["مستندات","اوراق","أوراق","ورق","documents","paperwork"], reply:function(t){ return t.docsInfo; } },
      { id:"booking", kw:["احجز","حجز","استشاره","استشارة","booking","book","consultation","appointment","ميعاد"], reply:function(t){ return t.bookingInfo; } },
      { id:"contact", kw:["تواصل","ايميل","إيميل","فيسبوك","facebook","email","contact","instagram"], reply:function(t){ return t.contactInfo; } },
      { id:"official", kw:["رسمي","سفاره","سفارة","حكومي","official","embassy","government"], reply:function(t){ return t.faq1; } },
      { id:"account", kw:["حساب","تسجيل","account","sign up","signup","register"], reply:function(t){ return t.faq2; } },
      { id:"free", kw:["مجاني","ببلاش","free"], reply:function(t){ return t.faq5; } },
      { id:"binding", kw:["ملزم","رسميه وملزمه","binding","official info"], reply:function(t){ return t.faq6; } },
      { id:"services", kw:["خدمات","خدماتكم","تساعدوا","تساعدونا","بتعملوا ايه","services","what do you offer","help with","what can you do"], reply:function(t){ return t.servicesList; } },
      { id:"greeting", kw:["اهلا","أهلا","السلام عليكم","هاي","هلا","صباح الخير","مساء الخير","hello","hi","hey"], reply:function(t){ return t.greeting; } }
    ];
  }

  function normalize(s){
    s = (s || "").toLowerCase().trim();
    s = s.replace(/[ً-ْـ]/g, "");
    s = s.replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ة/g,"ه");
    return s;
  }

  /* Detect the language of what the visitor actually typed, so the bot can
     reply in Arabic to Arabic messages and in English to English ones,
     regardless of the site's overall language toggle. */
  function detectMsgLang(msg){
    if(!msg) return null;
    var arabicChars = (String(msg).match(/[؀-ۿ]/g) || []).length;
    var latinChars = (String(msg).match(/[A-Za-z]/g) || []).length;
    if(arabicChars > 0 && arabicChars >= latinChars) return "ar";
    if(latinChars > 0) return "en";
    return null;
  }

  function matchTopic(msg){
    var n = normalize(msg);
    var list = topics();
    for(var i=0;i<list.length;i++){
      for(var j=0;j<list[i].kw.length;j++){
        if(n.indexOf(normalize(list[i].kw[j])) !== -1){
          return list[i];
        }
      }
    }
    return null;
  }

  /* ---------- Styles ---------- */
  var css = ""
  + ".igchat-launcher{position:fixed;bottom:22px;inset-inline-start:22px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#2952e3,#6d5bf7);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(41,82,227,.35);cursor:pointer;z-index:999;border:0;transition:transform .18s;padding:0}"
  + ".igchat-launcher:hover{transform:scale(1.07)}"
  + ".igchat-launcher svg{width:28px;height:28px}"
  + ".igchat-badge{position:absolute;top:2px;inset-inline-end:2px;width:13px;height:13px;border-radius:50%;background:#ef4444;border:2px solid #fff}"
  + ".igchat-teaser{position:fixed;bottom:92px;inset-inline-start:20px;max-width:250px;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 16px 40px rgba(15,27,51,.18);font-size:13.5px;line-height:1.5;color:#0f1b33;z-index:998;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;cursor:pointer;animation:igchat-pop .25s ease}"
  + ".igchat-teaser button{position:absolute;top:6px;inset-inline-end:8px;border:0;background:none;color:#9aa3c2;font-size:14px;cursor:pointer;line-height:1;padding:2px}"
  + "@keyframes igchat-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}"
  + ".igchat-panel{position:fixed;bottom:92px;inset-inline-start:22px;width:360px;max-width:92vw;height:min(560px,76vh);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,27,51,.28);display:none;flex-direction:column;overflow:hidden;z-index:1000;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,Arial,sans-serif}"
  + ".igchat-panel.igchat-open{display:flex}"
  + ".igchat-head{background:linear-gradient(135deg,#2952e3,#6d5bf7);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0}"
  + ".igchat-head .igchat-dot{width:9px;height:9px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.35);flex-shrink:0}"
  + ".igchat-head-text{flex:1;min-width:0}"
  + ".igchat-head-text b{display:block;font-size:15px;font-weight:800}"
  + ".igchat-head-text span{display:block;font-size:12px;opacity:.85;margin-top:1px}"
  + ".igchat-close{background:rgba(255,255,255,.18);border:0;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:15px;line-height:1;flex-shrink:0}"
  + ".igchat-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f7f8fc}"
  + ".igchat-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;white-space:pre-line;word-wrap:break-word}"
  + ".igchat-msg.bot{background:#eef1ff;color:#0f1b33;align-self:flex-start;border-end-start-radius:4px}"
  + ".igchat-msg.user{background:linear-gradient(135deg,#2952e3,#6d5bf7);color:#fff;align-self:flex-end;border-end-end-radius:4px}"
  + ".igchat-msg-name{display:block;font-size:11.5px;font-weight:700;color:#5b63d6;margin-bottom:2px}"
  + ".igchat-msg-time{display:block;font-size:10.5px;margin-top:4px;opacity:.6}"
  + ".igchat-msg.user .igchat-msg-time{color:#fff;text-align:end}"
  + ".igchat-msg.bot .igchat-msg-time{color:#4a5170}"
  + ".igchat-typing{align-self:flex-start;background:#eef1ff;border-radius:14px;padding:11px 15px;display:flex;gap:4px}"
  + ".igchat-typing span{width:6px;height:6px;border-radius:50%;background:#8b93ab;animation:igchat-blink 1.2s infinite}"
  + ".igchat-typing span:nth-child(2){animation-delay:.2s}.igchat-typing span:nth-child(3){animation-delay:.4s}"
  + "@keyframes igchat-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}"
  + ".igchat-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px;background:#f7f8fc;flex-shrink:0}"
  + ".igchat-chip{border:1px solid #e8eaf3;background:#fff;color:#2952e3;font-weight:700;font-size:12.5px;padding:7px 12px;border-radius:999px;cursor:pointer;transition:background .15s}"
  + ".igchat-chip:hover{background:#eef1ff}"
  + ".igchat-chip.igchat-agent{border-color:#16a34a;color:#16a34a}"
  + ".igchat-chip.igchat-agent:hover{background:#eafff2}"
  + ".igchat-stars{display:flex;gap:6px;padding:8px 4px}"
  + ".igchat-star{font-size:26px;line-height:1;color:#d7dae3;cursor:pointer;transition:color .15s,transform .1s;user-select:none}"
  + ".igchat-star:hover{transform:scale(1.15)}"
  + ".igchat-star-active{color:#f5a623}"
  + ".igchat-input-row{display:flex;gap:8px;padding:12px;border-top:1px solid #e8eaf3;flex-shrink:0;background:#fff}"
  + ".igchat-banned-banner{gap:10px;align-items:flex-start;padding:12px 14px;border-top:1px solid #f3c9c9;background:#fff5f5;flex-shrink:0}"
  + ".igchat-banned-banner .igchat-banned-icon{font-size:19px;line-height:1.3;flex-shrink:0}"
  + ".igchat-banned-banner .igchat-banned-text{font-size:12.5px;color:#9b2c2c;line-height:1.5}"
  + ".igchat-banned-banner .igchat-banned-text b{display:block;font-size:13.5px;margin-bottom:2px;color:#c53030}"
  + ".igchat-input-row input{flex:1;border:1px solid #e8eaf3;border-radius:12px;padding:10px 13px;font-size:13.5px;font-family:inherit;background:#fbfcff;color:#0f1b33;min-width:0}"
  + ".igchat-input-row input:focus{outline:2px solid #2952e3;outline-offset:1px}"
  + ".igchat-send{border:0;background:linear-gradient(135deg,#2952e3,#6d5bf7);color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}"
  + ".igchat-send svg{width:17px;height:17px}"
  + ".igchat-input-col{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}"
  + ".igchat-input-row input{width:100%}"
  + ".igchat-attach{border:1px solid #e8eaf3;background:#fbfcff;color:#2952e3;width:40px;height:40px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:17px}"
  + ".igchat-attach:hover{background:#eef1ff}"
  + ".igchat-emoji{border:1px solid #e8eaf3;background:#fbfcff;color:#2952e3;width:40px;height:40px;border-radius:50%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px}"
  + ".igchat-emoji:hover{background:#eef1ff}"
  + ".igchat-emoji-panel{position:absolute;bottom:56px;inset-inline-end:12px;background:#fff;border:1px solid #e0e6fb;border-radius:12px;box-shadow:0 6px 20px rgba(20,30,70,.15);padding:8px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;z-index:20;max-width:260px}"
  + ".igchat-emoji-panel button{border:0;background:none;font-size:20px;cursor:pointer;padding:4px;border-radius:6px;line-height:1}"
  + ".igchat-emoji-panel button:hover{background:#eef1ff}"
  + ".igchat-file-preview{display:flex;align-items:center;gap:6px;background:#eef1ff;border:1px solid #e0e6fb;border-radius:8px;padding:4px 10px;font-size:12px;color:#2952e3}"
  + ".igchat-file-preview button{background:none;border:0;color:#c0362c;cursor:pointer;font-size:12.5px;padding:0}"
  + ".igchat-attachment{margin-top:6px;display:block}"
  + ".igchat-attachment img{max-width:180px;max-height:180px;border-radius:10px;display:block}"
  + ".igchat-attachment a{color:inherit;text-decoration:underline;font-size:13px}"
  + "@media(max-width:480px){.igchat-panel{width:100vw;max-width:100vw;inset-inline-end:0;inset-inline-start:0;top:0;bottom:0;height:100vh;height:100dvh;border-radius:0}.igchat-head{padding:18px 18px;box-shadow:0 2px 10px rgba(0,0,0,.08)}.igchat-head-text b{font-size:16.5px}.igchat-body{padding:14px 14px 18px}.igchat-input-row{padding:12px 14px;padding-bottom:max(12px,env(safe-area-inset-bottom))}.igchat-launcher{width:54px;height:54px;bottom:16px;inset-inline-start:16px}.igchat-launcher.igchat-hide{display:none}}";

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- Markup ---------- */
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_CLOSE_LAUNCH = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

  var launcher = document.createElement("button");
  launcher.className = "igchat-launcher";
  launcher.setAttribute("aria-label", "Chat");
  launcher.innerHTML = '<span class="igchat-launcher-icon">' + ICON_CHAT + '</span><span class="igchat-badge" style="display:none"></span>';
  document.body.appendChild(launcher);
  var launcherIcon = launcher.querySelector(".igchat-launcher-icon");

  var panel = document.createElement("div");
  panel.className = "igchat-panel";
  panel.innerHTML =
    '<div class="igchat-head">' +
      '<span class="igchat-dot"></span>' +
      '<div class="igchat-head-text"><b class="igchat-brand"></b><span class="igchat-subtitle"></span></div>' +
      '<button class="igchat-close" aria-label="Close">✕</button>' +
    '</div>' +
    '<div class="igchat-body" id="igchatBody"></div>' +
    '<div class="igchat-chips" id="igchatChips"></div>' +
    '<div class="igchat-banned-banner" id="igchatBannedBanner" style="display:none"></div>' +
    '<div class="igchat-input-row">' +
      '<div class="igchat-input-col">' +
        '<input type="text" id="igchatInput" autocomplete="off">' +
        '<div class="igchat-file-preview" id="igchatFilePreview" style="display:none"></div>' +
      '</div>' +
      '<input type="file" id="igchatFileInput" style="display:none">' +
      '<div class="igchat-emoji-panel" id="igchatEmojiPanel" style="display:none"></div>' +
      '<button type="button" class="igchat-attach" id="igchatAttach" aria-label="Attach file">📎</button>' +
      '<button type="button" class="igchat-emoji" id="igchatEmoji" aria-label="Emoji">😊</button>' +
      '<button class="igchat-send" id="igchatSend" aria-label="Send">' + ICON_SEND + '</button>' +
    '</div>';
  document.body.appendChild(panel);

  var body = panel.querySelector("#igchatBody");
  var chipsRow = panel.querySelector("#igchatChips");
  var input = panel.querySelector("#igchatInput");
  var sendBtn = panel.querySelector("#igchatSend");
  var attachBtn = panel.querySelector("#igchatAttach");
  var fileInput = panel.querySelector("#igchatFileInput");
  var filePreview = panel.querySelector("#igchatFilePreview");
  var pendingVisitorFile = null;
  var emojiBtn = panel.querySelector("#igchatEmoji");
  var emojiPanel = panel.querySelector("#igchatEmojiPanel");
  var CHAT_MAX_FILE_BYTES = 5 * 1024 * 1024;
  var closeBtn = panel.querySelector(".igchat-close");
  var brandEl = panel.querySelector(".igchat-brand");
  var subtitleEl = panel.querySelector(".igchat-subtitle");

  var opened = false;
  var greeted = false;

  function waLink(text){
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
  }

  function formatMsgTime_(d){
    d = d || new Date();
    var time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    var day = d.toLocaleDateString("en-US", { weekday: "short" });
    return day + ", " + time;
  }

  function addMsg(text, who, file, senderName){
    var el = document.createElement("div");
    el.className = "igchat-msg " + who;
    if(senderName){
      var nameEl = document.createElement("span");
      nameEl.className = "igchat-msg-name";
      nameEl.appendChild(document.createTextNode(senderName));
      el.appendChild(nameEl);
    }
    if(text) el.appendChild(document.createTextNode(text));
    if(file && file.url) el.appendChild(buildAttachmentEl(file.url, file.name, file.mime));
    if(text){ visibleLog.push({role: who === "user" ? "user" : "bot", text: text}); }
    else if(file && file.name){ visibleLog.push({role: who === "user" ? "user" : "bot", text: "📎 " + file.name}); }
    var timeEl = document.createElement("div");
    timeEl.className = "igchat-msg-time";
    timeEl.appendChild(document.createTextNode(formatMsgTime_()));
    el.appendChild(timeEl);
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function buildAttachmentEl(url, name, mime){
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "igchat-attachment";
    if(mime && mime.indexOf("image/") === 0){
      var img = document.createElement("img");
      img.src = url;
      img.alt = name || "";
      a.appendChild(img);
    } else {
      a.textContent = "📎 " + (name || (lang()==="ar" ? "ملف مرفق" : "attached file"));
    }
    return a;
  }

  function readFileAsBase64(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){
        var result = reader.result || "";
        var idx = String(result).indexOf(",");
        resolve(idx !== -1 ? String(result).slice(idx+1) : String(result));
      };
      reader.onerror = function(){ reject(reader.error || new Error("read error")); };
      reader.readAsDataURL(file);
    });
  }

  function renderVisitorFilePreview(){
    if(!filePreview) return;
    if(!pendingVisitorFile){ filePreview.style.display = "none"; filePreview.innerHTML = ""; return; }
    filePreview.style.display = "flex";
    filePreview.innerHTML = "";
    filePreview.appendChild(document.createTextNode("📎 " + pendingVisitorFile.name + " "));
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "✕";
    clearBtn.onclick = clearVisitorAttachment;
    filePreview.appendChild(clearBtn);
  }

  function clearVisitorAttachment(){
    pendingVisitorFile = null;
    if(fileInput) fileInput.value = "";
    renderVisitorFilePreview();
  }

  function handleVisitorFilePick(){
    var picked = fileInput.files && fileInput.files[0];
    if(!picked) return;
    var t = T[lang()];
    if(picked.size > CHAT_MAX_FILE_BYTES){
      addMsg(t.fileTooBig, "bot");
      fileInput.value = "";
      return;
    }
    readFileAsBase64(picked).then(function(base64){
      pendingVisitorFile = { name: picked.name, mime: picked.type || "application/octet-stream", data: base64, raw: picked };
      renderVisitorFilePreview();
    }).catch(function(){});
  }

  function handleVisitorPaste(e){
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for(var i=0;i<items.length;i++){
      var it = items[i];
      if(it.kind === "file" && it.type && it.type.indexOf("image/") === 0){
        var picked = it.getAsFile();
        if(!picked) continue;
        e.preventDefault();
        var t = T[lang()];
        if(picked.size > CHAT_MAX_FILE_BYTES){
          addMsg(t.fileTooBig, "bot");
          return;
        }
        readFileAsBase64(picked).then(function(base64){
          pendingVisitorFile = { name: picked.name || ("clipboard-image." + (picked.type.split("/")[1] || "png")), mime: picked.type || "image/png", data: base64, raw: picked };
          renderVisitorFilePreview();
        }).catch(function(){});
        break;
      }
    }
  }

  if(attachBtn && fileInput){
    attachBtn.addEventListener("click", function(){ fileInput.click(); });
    fileInput.addEventListener("change", handleVisitorFilePick);
  }

  input.addEventListener("paste", handleVisitorPaste);

  var EMOJI_LIST = ["😀","😁","😂","🤣","😊","😍","😘","😉","😎","🤔","😅","🙏","👍","👏","🎉","❤️","🔥","✅","😢","😮"];
  if(emojiBtn && emojiPanel){
    EMOJI_LIST.forEach(function(em){
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = em;
      b.onclick = function(){ input.value += em; input.focus(); };
      emojiPanel.appendChild(b);
    });
    emojiBtn.addEventListener("click", function(e){
      e.stopPropagation();
      emojiPanel.style.display = (emojiPanel.style.display === "none") ? "grid" : "none";
    });
    document.addEventListener("click", function(e){
      if(emojiPanel.style.display !== "none" && !emojiPanel.contains(e.target) && e.target !== emojiBtn){
        emojiPanel.style.display = "none";
      }
    });
  }

  function addTyping(){
    var el = document.createElement("div");
    el.className = "igchat-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function setChips(list){
    chipsRow.innerHTML = "";
    list.forEach(function(c){
      var b = document.createElement("button");
      b.className = "igchat-chip" + (c.agent ? " igchat-agent" : "");
      b.textContent = c.label;
      b.onclick = c.onClick;
      chipsRow.appendChild(b);
    });
  }

  function baseChips(t){
    return [
      { label: t.qServices, onClick: function(){ handleUserPick(t.qServices, "services"); } },
      { label: t.qPrices, onClick: function(){ handleUserPick(t.qPrices, "prices"); } },
      { label: t.qSchengen, onClick: function(){ handleUserPick(t.qSchengen, "schengen"); } },
      { label: t.qAgent, onClick: function(){ handleUserPick(t.qAgent, "agent"); }, agent:true }
    ];
  }

  /* ---------- Live chat (real two-way handoff to customer service) ---------- */
  function jsonpFetch(url){
    return new Promise(function(resolve, reject){
      var cbName = "__igchatJsonp" + Date.now() + Math.floor(Math.random()*100000);
      var script = document.createElement("script");
      var done = false;
      window[cbName] = function(data){ done = true; resolve(data); cleanup(); };
      function cleanup(){ delete window[cbName]; if(script.parentNode) script.parentNode.removeChild(script); }
      script.onerror = function(){ if(!done){ reject(new Error("network error")); cleanup(); } };
      script.src = url + (url.indexOf("?")===-1?"?":"&") + "callback=" + cbName + "&t=" + Date.now();
      document.body.appendChild(script);
      setTimeout(function(){ if(!done){ reject(new Error("timeout")); cleanup(); } }, 15000);
    });
  }

  function genConvId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "c" + Date.now() + Math.random().toString(36).slice(2);
  }

  function ensureConversationId(){
    if(!conversationId){
      conversationId = genConvId();
      localStorage.setItem(CONV_KEY, conversationId);
    }
    return conversationId;
  }

  function showUnreadBadge(show){
    var badge = launcher.querySelector(".igchat-badge");
    if(badge) badge.style.display = show ? "block" : "none";
  }

  function sendVisitorChatMessage(text, isHandoffRequest, file){
    if(!GAS_URL || (!text && !file)) return;
    clearInactivityTimer();
    var payload = { type:"chat_visitor", conversationId: ensureConversationId(), message: text || "" };
    if(visitorName) payload.name = visitorName;
    if(isHandoffRequest === true) {
      payload.handoff = true;
      var __transcript = buildVisibleTranscript();
      if(__transcript) payload.transcript = __transcript;
    }
    else if(isHandoffRequest === "followup") payload.followup = true;
    if(file){
      payload.fileData = file.data;
      payload.fileName = file.name;
      payload.fileMime = file.mime;
    }
    fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    }).catch(function(){});
  }

  function sendRating_(convId, stars, t){
    if(!GAS_URL || !convId) return;
    fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({ type:"chat_rating", conversationId: convId, stars: stars })
    }).catch(function(){});
    addMsg(t.rateThanks, "bot");
    try{
      var ratedInputRow = panel.querySelector(".igchat-input-row");
      if(ratedInputRow) ratedInputRow.style.display = "";
    }catch(e){}
    setChips(baseChips(t));
  }

  function renderStarRating_(convId, t){
    chipsRow.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "igchat-stars";
    var starEls = [];
    function highlightStars(n){
      starEls.forEach(function(s, idx){
        s.className = "igchat-star" + (idx < n ? " igchat-star-active" : "");
      });
    }
    for(var i = 1; i <= 5; i++){
      (function(i){
        var st = document.createElement("span");
        st.className = "igchat-star";
        st.textContent = "★";
        st.onmouseenter = function(){ highlightStars(i); };
        st.onclick = function(){ chipsRow.innerHTML = ""; sendRating_(convId, i, t); };
        starEls.push(st);
        wrap.appendChild(st);
      })(i);
    }
    wrap.onmouseleave = function(){ highlightStars(0); };
    chipsRow.appendChild(wrap);
  }

  function applyChatClosed(){
    var t = T[lastVisitorLang || lang()];
    var closedConvId = conversationId;
    addMsg(t.chatClosedNote, "bot");
    if(!opened) showUnreadBadge(true);
    endLiveChat();
    setChips([
      { label: t.closeContinue, onClick: function(){ beginLiveChat(t.continueTriggerMsg); } },
      { label: t.closeRate, onClick: function(){ renderStarRating_(closedConvId, t); } }
    ]);
    try{
      var closedInputRow = panel.querySelector(".igchat-input-row");
      if(closedInputRow) closedInputRow.style.display = "none";
    }catch(e){}
  }

  function applyChatBanned(){
    chatBanned = true;
    lockChatForBan();
    var t = T[lastVisitorLang || lang()];
    addMsg(t.chatBannedNote, "bot");
    if(!opened) showUnreadBadge(true);
    endLiveChat();
    setChips([]);
    startBanWatch();
  }

  function lockChatForBan(){
    try{
      input.disabled = true;
      sendBtn.disabled = true;
      var inputRow = panel.querySelector(".igchat-input-row");
      if(inputRow) inputRow.style.display = "none";
      var bannedBanner = panel.querySelector("#igchatBannedBanner");
      if(bannedBanner){
        var bt = T[lastVisitorLang || lang()];
        bannedBanner.innerHTML = '<span class="igchat-banned-icon">🚫</span><span class="igchat-banned-text"><b>' + bt.chatBannedTitle + '</b>' + bt.chatBannedNote + '</span>';
        bannedBanner.style.display = "flex";
      }
    }catch(e){}
  }

  function unlockChatAfterUnban(){
    chatBanned = false;
    bannedNoteShown = false;
    try{
      input.disabled = false;
      sendBtn.disabled = false;
      var inputRow2 = panel.querySelector(".igchat-input-row");
      if(inputRow2) inputRow2.style.display = "";
      var bannedBanner2 = panel.querySelector("#igchatBannedBanner");
      if(bannedBanner2) bannedBanner2.style.display = "none";
    }catch(e){}
    var ut = T[lastVisitorLang || lang()];
    addMsg(ut.chatUnbannedNote, "bot");
    setChips(baseChips(ut));
    if(!opened) showUnreadBadge(true);
  }

  function startBanWatch(){
    if(banWatchTimer) return;
    banWatchTimer = setInterval(function(){
      if(!GAS_URL || !conversationId) return;
      jsonpFetch(GAS_URL + "?action=checkBan&conversationId=" + encodeURIComponent(conversationId)).then(function(data){
        if(data && data.status === "success" && !data.banned){
          clearInterval(banWatchTimer);
          banWatchTimer = null;
          unlockChatAfterUnban();
        }
      }).catch(function(){});
    }, 3000);
  }

  function clearInactivityTimer(){
    if(inactivityCloseTimer){ clearTimeout(inactivityCloseTimer); inactivityCloseTimer = null; }
  }

  function resetInactivityTimer(){
    clearInactivityTimer();
    if(liveChatActive){
      inactivityCloseTimer = setTimeout(function(){
        inactivityCloseTimer = null;
        if(liveChatActive) applyChatClosed();
      }, INACTIVITY_CLOSE_MS);
    }
  }

  function syncChatMessages(){
    if(!GAS_URL || !conversationId) return;
    jsonpFetch(GAS_URL + "?conversationId=" + encodeURIComponent(conversationId)).then(function(data){
      if(!data || data.status !== "success") return;
      (data.items || []).forEach(function(item){
        if(renderedChatRows[item.row]) return;
        renderedChatRows[item.row] = true;
        if(item.type === "chat_admin"){
          var adminFile = null;
          if(item.fileUrl){
            var adminMeta = {};
            try{ adminMeta = item.fileMeta ? JSON.parse(item.fileMeta) : {}; }catch(e){}
            adminFile = { url: item.fileUrl, name: adminMeta.name, mime: adminMeta.mime };
          }
          addMsg(item.message || "", "bot", adminFile, item.name || (lang()==="ar" ? "خدمة العملاء" : "Customer Service"));
          if(!opened) showUnreadBadge(true);
          resetInactivityTimer();
        } else if(item.type === "chat_visitor"){
          if(sentTexts.length && sentTexts[0] === item.message){
            sentTexts.shift();
          } else {
            addMsg(item.message || "", "user");
          }
        } else if(item.type === "chat_close"){
          if(!isInitialSync) applyChatClosed();
        } else if(item.type === "chat_ban"){
          if(!isInitialSync) applyChatBanned();
        }
      });
      isInitialSync = false;
    }).catch(function(){});
  }

  function endLiveChat(){
    liveChatActive = false;
    clearInactivityTimer();
    try{ localStorage.removeItem(LIVECHAT_KEY); }catch(e){}
    hydrated = false;
    if(chatPollTimer){ clearTimeout(chatPollTimer); chatPollTimer = null; }
    visibleLog = [];
    setChips(baseChips(T[lastVisitorLang || lang()]));
  }

  function scheduleNextSync(){
    if(chatPollTimer){ clearTimeout(chatPollTimer); chatPollTimer = null; }
    if(!liveChatActive || !conversationId) return;
    var delay = opened ? 1000 : 5000;
    chatPollTimer = setTimeout(function(){
      syncChatMessages();
      scheduleNextSync();
    }, delay);
  }

  function beginLiveChat(triggerText, file){
    try{
      var resumeInputRow = panel.querySelector(".igchat-input-row");
      if(resumeInputRow) resumeInputRow.style.display = "";
    }catch(e){}
    if(!visitorName){
      pendingHandoff = { text: triggerText, file: file };
      addMsg(T[lastVisitorLang || lang()].askName, "bot");
      setChips([]);
      return;
    }
    liveChatActive = true;
    localStorage.setItem(LIVECHAT_KEY, "1");
    hydrated = true;
    setChips([]);
    sentTexts.push(triggerText);
    sendVisitorChatMessage(triggerText, true, file);
    scheduleNextSync();
  }

  function hydrateLiveChatIfNeeded(){
    if(!liveChatActive || !conversationId || hydrated) return;
    hydrated = true;
    var t = T[lang()];
    setChips([]);
    addMsg(t.liveChatWelcomeBack, "bot");
    isInitialSync = true;
    syncChatMessages();
    scheduleNextSync();
  }

  function replyWithTopic(topic, t, triggerText){
    var typingEl = addTyping();
    setTimeout(function(){
      typingEl.remove();
      if(topic.handoff){
        beginLiveChat(triggerText);
      } else {
        addMsg(topic.reply(t), "bot");
        setChips(baseChips(t));
      }
    }, 420 + Math.random()*260);
  }

  function handleUserPick(label, topicId){
    addMsg(label, "user");
    var t = T[lang()];
    if(liveChatActive){ sentTexts.push(label); sendVisitorChatMessage(label, "followup"); return; }
    var found = null;
    topics().some(function(tp){ if(tp.id === topicId){ found = tp; return true; } return false; });
    if(found){ replyWithTopic(found, t, label); }
  }

  function startIntake(topic, firstMsg, file, t){
    intakeState = { type: topic.id, parts: [firstMsg], pendingFile: file || null, askedMore: false };
    addMsg(topic.reply(t), "bot");
    setChips([]);
  }

  function continueIntake(msg, file, t){
    var typingEl = addTyping();
    setTimeout(function(){
      typingEl.remove();
      if(!intakeState) return;
      if(msg) intakeState.parts.push(msg);
      if(file) intakeState.pendingFile = file;
      if(!intakeState.askedMore){
        intakeState.askedMore = true;
        addMsg(t.intakeMoreQuestion, "bot");
        setChips([
          { label: t.intakeDoneLabel, onClick: function(){ addMsg(t.intakeDoneLabel, "user"); setChips([]); finishIntake(t); } },
          { label: t.intakeAddMoreLabel, onClick: function(){ addMsg(t.intakeAddMoreLabel, "user"); setChips([]); if(intakeState) intakeState.askedMore = false; } }
        ]);
      } else {
        finishIntake(t);
      }
    }, 420 + Math.random()*260);
  }

  function finishIntake(t){
    var state = intakeState;
    intakeState = null;
    if(!state) return;
    var label = state.type === "complaint" ? t.complaintLabel : t.requestLabel;
    var summary = label + ":\n" + state.parts.join("\n");
    addMsg(t.intakeClosing, "bot");
    beginLiveChat(summary, state.pendingFile);
  }

  /* ---------- AI-assisted conversation (Gemini, via the Apps Script backend) ----------
     Used for complaints/requests and for anything the keyword bot can't match, so the
     visitor gets a real short back-and-forth instead of a canned "not sure" message,
     and by the time it reaches the admin the conversation already has real context.
     If no API key is configured server-side (or the call fails), this silently falls
     back to the old scripted behaviour below — nothing breaks either way. */
  function buildVisibleTranscript(){
    if(!visibleLog.length) return "";
    return visibleLog.map(function(h){ return (h.role === "user" ? "👤" : "🤖") + " " + h.text; }).join("\n");
  }

  function buildAiSummary(state){
    var isAr = lang() === "ar";
    var label = state.kind === "complaint"
      ? (isAr ? "📩 شكوى جديدة (عبر المساعد الذكي)" : "📩 New complaint (via AI assistant)")
      : state.kind === "request"
        ? (isAr ? "📩 طلب جديد (عبر المساعد الذكي)" : "📩 New request (via AI assistant)")
        : (isAr ? "📩 محادثة محتاجة متابعة (عبر المساعد الذكي)" : "📩 Conversation needing follow-up (via AI assistant)");
    var lines = state.history.map(function(h){ return (h.role === "user" ? "👤" : "🤖") + " " + h.text; });
    return label + ":\n" + lines.join("\n");
  }

  function aiReplyRequest(history, uiLang){
    var url = GAS_URL + "?action=aiReply&lang=" + encodeURIComponent(uiLang) + "&history=" + encodeURIComponent(JSON.stringify(history));
    return jsonpFetch(url).then(function(data){
      if(!data || data.status !== "success") return null;
      return data.ai || null;
    }).catch(function(){ return null; });
  }

  function startAiChat(kind, firstMsg, file, t, msgLang){
    aiChatState = { kind: kind, history: [{role:"user", text: firstMsg}], turns: 1, pendingFile: file || null };
    var typingEl = addTyping();
    aiReplyRequest(aiChatState.history, msgLang).then(function(ai){
      typingEl.remove();
      if(!ai){
        aiChatState = null;
        if(kind === "fallback"){
          addMsg(t.fallback, "bot");
          setChips(baseChips(t));
        } else {
          var topic = null;
          topics().some(function(tp){ if(tp.id === kind){ topic = tp; return true; } return false; });
          if(topic){ startIntake(topic, firstMsg, file, t); } else { addMsg(t.fallback, "bot"); setChips(baseChips(t)); }
        }
        return;
      }
      aiChatState.history.push({role:"bot", text: ai.reply});
      if(ai.handoff){
        var summary = buildAiSummary(aiChatState);
        var pendingFile = aiChatState.pendingFile;
        aiChatState = null;
        beginLiveChat(summary, pendingFile);
      } else {
        addMsg(ai.reply, "bot");
        setChips([]);
      }
    });
  }

  function continueAiChat(msg, file, t, msgLang){
    if(!aiChatState) return;
    aiChatState.history.push({role:"user", text: msg});
    aiChatState.turns++;
    if(file) aiChatState.pendingFile = file;
    var forceCap = aiChatState.turns >= 5;
    var typingEl = addTyping();
    aiReplyRequest(aiChatState.history, msgLang).then(function(ai){
      typingEl.remove();
      if(!aiChatState) return;
      if(!ai){
        var summary = buildAiSummary(aiChatState);
        var pendingFile = aiChatState.pendingFile;
        aiChatState = null;
        addMsg(t.intakeClosing, "bot");
        beginLiveChat(summary, pendingFile);
        return;
      }
      aiChatState.history.push({role:"bot", text: ai.reply});
      if(ai.handoff || forceCap){
        var summary2 = buildAiSummary(aiChatState);
        var pendingFile2 = aiChatState.pendingFile;
        aiChatState = null;
        beginLiveChat(summary2, pendingFile2);
      } else {
        addMsg(ai.reply, "bot");
      }
    });
  }

  function handleFreeText(msg, file, fileOnly){
    var msgLang = detectMsgLang(msg) || lang();
    lastVisitorLang = msgLang;
    var t = T[msgLang];
    var localFile = (file && file.raw) ? { url: URL.createObjectURL(file.raw), name: file.name, mime: file.mime } : null;
    addMsg(fileOnly ? "" : msg, "user", localFile);
    if(pendingHandoff){
      if(fileOnly){
        addMsg(t.askName, "bot");
        return;
      }
      visitorName = msg.trim().slice(0, 60);
      try{ localStorage.setItem(VISITOR_NAME_KEY, visitorName); }catch(e){}
      var trig = pendingHandoff;
      pendingHandoff = null;
      beginLiveChat(trig.text, trig.file);
      return;
    }
    if(liveChatActive){
      sentTexts.push(msg);
      sendVisitorChatMessage(msg, "followup", file);
      return;
    }
    if(aiChatState){
      continueAiChat(msg, file, t, msgLang);
      return;
    }
    if(intakeState){
      continueIntake(msg, file, t);
      return;
    }
    var found = matchTopic(msg);
    var typingEl = addTyping();
    setTimeout(function(){
      typingEl.remove();
      if(found && found.intake){
        startAiChat(found.id, msg, file, t, msgLang);
      } else if(found){
        if(found.handoff){ beginLiveChat(msg, file); } else { addMsg(found.reply(t), "bot"); setChips(baseChips(t)); }
      } else if(file){
        addMsg(t.fileHandoffReply, "bot");
        beginLiveChat(msg, file);
      } else {
        startAiChat("fallback", msg, file, t, msgLang);
      }
    }, 420 + Math.random()*260);
  }

  function refreshLabels(){
    var t = T[lang()];
    brandEl.textContent = t.brand;
    subtitleEl.textContent = t.subtitle;
    input.placeholder = t.placeholder;
    panel.dir = lang() === "ar" ? "rtl" : "ltr";
  }

  function openPanel(){
    refreshLabels();
    panel.classList.add("igchat-open");
    launcherIcon.innerHTML = ICON_CLOSE_LAUNCH;
    if(window.matchMedia && window.matchMedia("(max-width:480px)").matches){
      launcher.classList.add("igchat-hide");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    opened = true;
    showUnreadBadge(false);
    var teaser = document.getElementById("igchatTeaser");
    if(teaser) teaser.remove();
    if(chatBanned){
      setChips([]);
      if(!bannedNoteShown){
        bannedNoteShown = true;
        addMsg(T[lastVisitorLang || lang()].chatBannedNote, "bot");
      }
    } else if(liveChatActive){
      hydrateLiveChatIfNeeded();
      scheduleNextSync();
    } else if(!greeted){
      greeted = true;
      var t = T[lang()];
      setTimeout(function(){
        addMsg(t.greeting, "bot");
        setChips(baseChips(t));
      }, 300);
    }
    input.focus();
  }

  function closePanel(){
    panel.classList.remove("igchat-open");
    launcherIcon.innerHTML = ICON_CHAT;
    launcher.classList.remove("igchat-hide");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    opened = false;
    scheduleNextSync();
  }

  if(liveChatActive){ scheduleNextSync(); }

  if(GAS_URL && conversationId){
    jsonpFetch(GAS_URL + "?action=checkBan&conversationId=" + encodeURIComponent(conversationId)).then(function(data){
      if(data && data.status === "success" && data.banned){
        chatBanned = true;
        lockChatForBan();
        liveChatActive = false;
        try{ localStorage.removeItem(LIVECHAT_KEY); }catch(e){}
        if(chatPollTimer){ clearTimeout(chatPollTimer); chatPollTimer = null; }
        startBanWatch();
      }
    }).catch(function(){});
  }

  launcher.addEventListener("click", function(){
    if(opened) closePanel(); else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  function submitInput(){
    if(chatBanned) return;
    var v = input.value.trim();
    var file = pendingVisitorFile;
    if(!v && !file) return;
    var t = T[lang()];
    var fileOnly = !v && !!file;
    var displayText = v || ("📎 " + (file ? file.name : ""));
    input.value = "";
    clearVisitorAttachment();
    handleFreeText(displayText, file, fileOnly);
  }
  sendBtn.addEventListener("click", submitInput);
  input.addEventListener("keydown", function(e){
    if(e.key === "Enter"){ submitInput(); }
  });

  /* ---------- Proactive teaser bubble ---------- */
  function showTeaser(){
    if(opened) return;
    if(sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    var t = T[lang()];
    var el = document.createElement("div");
    el.className = "igchat-teaser";
    el.id = "igchatTeaser";
    el.dir = lang() === "ar" ? "rtl" : "ltr";
    el.innerHTML = '<button aria-label="close">✕</button><div class="igchat-teaser-text"></div>';
    el.querySelector(".igchat-teaser-text").textContent = t.teaser;
    el.addEventListener("click", function(e){
      if(e.target.tagName === "BUTTON"){ el.remove(); return; }
      openPanel();
    });
    document.body.appendChild(el);
    setTimeout(function(){ if(document.body.contains(el)) el.remove(); }, 12000);
  }
  setTimeout(showTeaser, 3500);

  /* ---------- Hide the old simple WhatsApp float button, if present ---------- */
  var oldBtn = document.getElementById("waFloatBtn");
  if(oldBtn) oldBtn.style.display = "none";

  /* ---------- Pull the WhatsApp number + chat backend URL from site-settings.json (fallbacks stay hardcoded) ---------- */
  fetch(PREFIX + "site-settings.json", { cache: "no-store" }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
    if(!data) return;
    var wa = data.contact_whatsapp && (data.contact_whatsapp.ar || data.contact_whatsapp.en);
    if(wa){
      var m = wa.match(/(\d{8,15})\s*$/) || wa.match(/wa\.me\/(\d{8,15})/);
      if(m) WA_NUMBER = m[1];
    }
    if(typeof data.requests_webhook_url === "string" && data.requests_webhook_url){
      GAS_URL = data.requests_webhook_url;
    }
  }).catch(function(){});

})();
