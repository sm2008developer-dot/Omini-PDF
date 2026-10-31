# Omini PDF - Deployment, FreeModel AI & Google Search SEO Ranking Guide
**Built by Code Garage | Developed by SM Developer**

---

## ১. FreeModel AI (১ মিলিয়ন ফ্রি টোকেন) সেটআপ ও মডেল নির্বাচন

আমরা জেমিনাই-এর জায়গায় **FreeModel OpenAI-Compatible API (`https://freemodel.in/v1`)** ইন্টিগ্রেট করেছি, যা থেকে আপনি **১,০০০,০০০ (১ মিলিয়ন) ফ্রি টোকেন** পাবেন।

### API Key পাওয়ার ও বসানোর সহজ নিয়ম:
1. **API Key তৈরি করুন:**
   - ব্রাউজারে যান: [freemodel.in](https://freemodel.in)
   - একাউন্ট তৈরি করুন এবং ড্যাশবোর্ড থেকে আপনার **API Key** কপি করুন (এটি ১ মিলিয়ন ফ্রি টোকেন সহ আসে)।
2. **অ্যাডমিন প্যানেল থেকে বসান (খুবই সহজ):**
   - আপনার সাইটের এডমিন একাউন্টে (`codegarage1@gmail.com`) লগইন করুন।
   - **Admin Command Center**-এ যান এবং **Platform & Gateway** ট্যাবে ক্লিক করুন।
   - **FreeModel API Key** বক্সে আপনার কপি করা কি-টি পেস্ট করুন।
   - ড্রপডাউন থেকে যেকোনো মডেল সিলেক্ট করুন (যেমন: `gpt-4o-mini`, `deepseek-chat`, `gemini-2.5-flash`, `gpt-4o`, `claude-3-5-sonnet`) অথবা ইচ্ছামতো কাস্টম মডেল টাইপ করুন।
   - **Test FreeModel Connection** বাটনে ক্লিক করলেই সবুজ ব্যাজ দিয়ে সংযোগ ভেরিফাই হবে।
   - নিচে **Save & Broadcast Changes** বাটনে ক্লিক করলেই সাইটে লাইভ কার্যকর হবে।
3. **Environment Variable-এও রাখতে পারেন:**
   - হোস্টিংয়ের এনভায়রনমেন্ট ভ্যারিয়েবলে `FREEMODEL_API_KEY="আপনার_কী"` সেট করতে পারেন।

*নোট: যদি কখনো কোনো API Key না দেওয়া থাকে বা ফ্রি টোকেন শেষ হয়ে যায়, তবুও সাইট ক্র্যাশ করবে না — স্বয়ংক্রিয় ইন্টেলিজেন্ট লোকাল ইঞ্জিন কাজ চালিয়ে যাবে।*

---

## ২. কুপন কোড (১০০% সহ যেকোনো কুপন) এডিট ও ডিলিট করার সুবিধা

অ্যাডমিন এখন সব ধরনের কুপন কোডের উপর সম্পূর্ণ নিয়ন্ত্রণ পাবেন:
- **Edit Voucher:** যেকোনো কুপনের পাশে **Edit** বাটনে ক্লিক করে কোডের নাম, ডিসকাউন্ট % (১% থেকে ১০০%), মেয়াদ বা সর্বোচ্চ ব্যবহারের লিমিট পরিবর্তন করতে পারবেন।
- **Delete Voucher:** যেকোনো কুপন ডিলিট বাটনে ক্লিক করলে তা ডাটাবেস থেকে স্থায়ীভাবে মুছে যাবে এবং ব্যবহারকারীরা আর তা ব্যবহার করতে পারবে না (কোনো ব্যাকগ্রাউন্ড পুনর্জন্ম হবে না)।
- **Enable/Disable:** সাময়িকভাবে যেকোনো কুপন বন্ধ বা চালু করতে পারবেন।

---

## ৩. টপ হোস্টিং প্ল্যাটফর্ম ও হোস্ট করার সহজ পদ্ধতি

Omini PDF ফুল-স্ট্যাক নোড.জেএস (Express + Vite React) হওয়ায় নিচের প্ল্যাটফর্মগুলোতে সবচেয়ে ভালো ও দ্রুত চলে:

### ক. Render.com (টপ রেকমেন্ডেড - ফ্রি ও সহজ)
1. GitHub-এ কোড পুশ করুন।
2. [Render.com](https://render.com)-এ **New Web Service** খুলুন।
3. রিপোজিটরি কানেক্ট করে নিচের সেটিংস দিন:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Environment Variables দিন:
   - `FREEMODEL_API_KEY`: আপনার FreeModel API Key
   - `APP_URL`: আপনার কাস্টম ডোমেইন (যেমন: `https://yourdomain.com`)
   - `ADMIN_EMAIL`: `codegarage1@gmail.com`
   - `NODE_ENV`: `production`
5. **Create Web Service**-এ ক্লিক করলেই আপনার সাইট লাইভ হয়ে যাবে।

### খ. Railway.app (সুপার ফাস্ট)
Render-এর মতোই GitHub রিপোজিটরি সিলেক্ট করে `npm install && npm run build` ও `npm start` দিলেই স্বয়ংক্রিয়ভাবে ডিপ্লয় হয়ে যায়।

### গ. নিজস্ব VPS (Hostinger / DigitalOcean / Ubuntu)
```bash
git clone <your-repo-url> omini-pdf
cd omini-pdf
npm install
npm run build
cp .env.example .env # .env তে আপনার কি ও ডোমেইন দিন
npm install -g pm2
pm2 start server.ts --name omini-pdf --interpreter tsx
```

---

## ৪. Google Search-এ সবার উপরে র‍্যাংক (Rank #1) করার পূর্ণাঙ্গ কৌশল

### ধাপ ১: Google Search Console ভেরিফিকেশন
1. [Google Search Console](https://search.google.com/search-console)-এ যান।
2. আপনার ডোমেইন অ্যাড করে **HTML Tag** ভেরিফিকেশন কোড নিন।
3. `index.html`-এর ১৫ নম্বর লাইনে কোডটি বসিয়ে দিন:
   ```html
   <meta name="google-site-verification" content="আপনার_কোড" />
   ```
4. সার্চ কনসোলে **Verify** চাপুন।

### ধাপ ২: Sitemap সাবমিট
- Search Console-এর **Sitemaps** মেনুতে গিয়ে শুধু লিখুন: `sitemap.xml` এবং **Submit** দিন।
- Omini PDF-এর ডায়নামিক সাইটম্যাপটি স্বয়ংক্রিয়ভাবে গুগলকে প্রতিটি টুল (Merge, Split, Compress, AI Summarizer, Edit Metadata, ইত্যাদি) ইনডেক্স করতে পাঠাবে।

### ধাপ ৩: কী-ওয়ার্ড ও র‍্যাংকিং স্ট্র্যাটেজি
1. **হাই-ট্র্যাফিক লং-টেইল কী-ওয়ার্ড:** সাইটে `index.html` ও Schema FAQ Snippet-এ যুক্ত করা আছে:
   - *"free online pdf editor no watermark"*
   - *"compress pdf to 100kb free"*
   - *"chat with pdf ai free"*
   - *"edit pdf metadata title author online"*
2. **সুপার ফাস্ট স্পিড (Core Web Vitals):** পুরো প্রজেক্ট লাইটওয়েট এবং ক্লায়েন্ট-সাইড মেমোরি ইঞ্জিনে চলায় গুগল স্পিড টেস্টে ৯০+ স্কোর থাকবে, যা গুগলে র‍্যাংকিং বাড়ানোর জন্য অত্যন্ত জরুরি।
3. **সোশ্যাল শেয়ার ও ব্যাকলিঙ্ক:** ফেসবুক গ্রুপ, লিংকডইন ও প্রযুক্তি ব্লগে *"Best Free Online AI PDF Suite by Code Garage"* হিসেবে সাইটটি শেয়ার করুন।
