#!/usr/bin/env node
/**
 * Absolute Transportation Blog Cron Publisher
 * Runs continuously, fires live_publish logic at:
 *   7:00 AM ET  (11:00 UTC EDT / 12:00 UTC EST)
 *   1:00 PM ET  (17:00 UTC EDT / 18:00 UTC EST)
 *   8:46 PM ET  (00:46 UTC EDT / 01:46 UTC EST)
 * Env vars: ANTHROPIC_API_KEY, WP_APP_PASSWORD
 */

const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const WP_URL = 'wordpress-production-91c8.up.railway.app';
const WP_AUTH = 'Basic ' + Buffer.from('admin:' + (process.env.WP_APP_PASSWORD || 'nhbn 3BcS 1sg9 Exzx UzG7 9nwf')).toString('base64');

// ET fire times: [hour, minute] in ET (handles DST via Intl)
const FIRE_TIMES_ET = [
  [7, 0],
  [13, 0],
  [20, 46]
];

const WP_CATS = {
  "airport-transportation":3,"wedding-transportation":4,"prom-events":5,"corporate-black-car":6,
  "local-city-guides":7,"medical-senior":8,"family-transportation":9,"specialty-accessible":10,
  "tourism-day-trips":11,"vehicle-guides":12,"cost-booking-guides":13,"safety-industry":14,
  "commuter-daily":15,"cruise-train-connections":16,"routes-destinations":17,"industry-partnerships":18,
  "best-of-ct":19,"ct-living":20,"emergency-weather":21,"ultimate-guides":22
};

const TOPICS = [
  {topic:"What Is the Best Airport Transportation in CT for Early Morning Flights?",primaryKeyword:"best airport transportation in CT",intent:"Commercial",category:"airport-transportation"},
  {topic:"How Much Is Airport Car Service in Connecticut?",primaryKeyword:"how much is airport car service in Connecticut",intent:"Informational",category:"airport-transportation"},
  {topic:"CT to JFK Airport Car Service: When Should You Leave for Your Flight?",primaryKeyword:"CT to JFK airport car service",intent:"Informational",category:"airport-transportation"},
  {topic:"CT to LGA Airport Transportation: Sedan, SUV, or Limo?",primaryKeyword:"CT to LGA airport transportation",intent:"Commercial",category:"airport-transportation"},
  {topic:"CT to Newark Airport Limo Service: Who Is It Best For?",primaryKeyword:"CT to Newark airport limo service",intent:"Informational",category:"airport-transportation"},
  {topic:"Private Airport Transfer CT: Why Business Travelers Prefer It",primaryKeyword:"private airport transfer CT",intent:"Commercial",category:"airport-transportation"},
  {topic:"Car Service to Bradley Airport from CT: Best Towns and Travel Tips",primaryKeyword:"car service to Bradley Airport from CT",intent:"Informational",category:"airport-transportation"},
  {topic:"Are There 24/7 Airport Car Services in Connecticut?",primaryKeyword:"24/7 airport car services in Connecticut",intent:"Informational",category:"airport-transportation"},
  {topic:"Wedding Transportation Services in CT: A Complete Planning Guide",primaryKeyword:"wedding transportation services in CT",intent:"Informational",category:"wedding-transportation"},
  {topic:"Wedding Limo Service in Connecticut: How to Pick the Right Fleet",primaryKeyword:"wedding limo service in Connecticut",intent:"Commercial",category:"wedding-transportation"},
  {topic:"How Far in Advance Should You Book Wedding Transportation in CT?",primaryKeyword:"how far in advance should I book wedding transportation in CT",intent:"Informational",category:"wedding-transportation"},
  {topic:"Bridal Party Transportation CT: What Size Vehicle Do You Need?",primaryKeyword:"bridal party transportation CT",intent:"Informational",category:"wedding-transportation"},
  {topic:"Wedding Shuttle Service CT: When Couples Actually Need One",primaryKeyword:"wedding shuttle service CT",intent:"Commercial",category:"wedding-transportation"},
  {topic:"Prom Limo Service in Connecticut: How Early Should You Reserve?",primaryKeyword:"prom limo service in Connecticut",intent:"Informational",category:"prom-events"},
  {topic:"Party Bus or Limo for Prom in CT: Which One Fits Your Group?",primaryKeyword:"party bus or limo for prom in CT",intent:"Comparison",category:"prom-events"},
  {topic:"How Much Does Prom Limo Service Cost in CT?",primaryKeyword:"how much does prom limo service cost in CT",intent:"Informational",category:"prom-events"},
  {topic:"Corporate Car Service CT: Why Companies Book Chauffeured Transportation",primaryKeyword:"corporate car service CT",intent:"Commercial",category:"corporate-black-car"},
  {topic:"Executive Transportation Services CT for Meetings, Roadshows, and Airport Runs",primaryKeyword:"executive transportation services CT",intent:"Transactional",category:"corporate-black-car"},
  {topic:"Black Car Service CT vs Standard Car Service: What's the Difference?",primaryKeyword:"black car service CT",intent:"Comparison",category:"corporate-black-car"},
  {topic:"Senior Transportation Services in CT: Safe, Comfortable, Reliable",primaryKeyword:"senior transportation services CT",intent:"Informational",category:"medical-senior"},
  {topic:"Non-Emergency Medical Transportation in Connecticut: What Families Should Know",primaryKeyword:"non-emergency medical transportation CT",intent:"Informational",category:"medical-senior"},
  {topic:"Family Airport Transportation in CT: Car Seats, Luggage, and Stress-Free Travel",primaryKeyword:"family airport transportation CT",intent:"Informational",category:"family-transportation"},
  {topic:"Car Service with Car Seats in Connecticut: What Parents Need to Know",primaryKeyword:"car service with car seats CT",intent:"Informational",category:"family-transportation"},
  {topic:"How Much Does a Limo Cost in Connecticut? Full 2026 Pricing Guide",primaryKeyword:"how much does a limo cost CT",intent:"AEO",category:"cost-booking-guides"},
  {topic:"How Much Should You Tip a Limo Driver in CT?",primaryKeyword:"how much to tip limo driver CT",intent:"AEO",category:"cost-booking-guides"},
  {topic:"How to Book a Car Service in Connecticut: Step-by-Step Guide",primaryKeyword:"how to book car service CT",intent:"AEO",category:"cost-booking-guides"},
  {topic:"Connecticut Limo Laws Explained: What Every Passenger Should Know",primaryKeyword:"Connecticut limo laws",intent:"Informational",category:"safety-industry"},
  {topic:"Is Limo Service in Connecticut Safe? Licensing, Insurance, and DOT Rules",primaryKeyword:"is limo service safe CT",intent:"AEO",category:"safety-industry"},
  {topic:"Red Flags When Booking a Limo Company in Connecticut",primaryKeyword:"red flags limo company CT",intent:"Informational",category:"safety-industry"},
  {topic:"Sedan vs SUV vs Stretch Limo: Which Vehicle Is Right for Your CT Ride?",primaryKeyword:"sedan vs SUV vs limo CT",intent:"Comparison",category:"vehicle-guides"},
  {topic:"Sprinter Van vs Party Bus in Connecticut: Capacity, Cost, and Comfort",primaryKeyword:"Sprinter van vs party bus CT",intent:"Comparison",category:"vehicle-guides"},
  {topic:"Cruise Port Transportation from Connecticut: Cape Liberty, Manhattan, and Brooklyn",primaryKeyword:"cruise port transportation CT",intent:"Transactional",category:"cruise-train-connections"},
  {topic:"Amtrak Station Car Service in Connecticut: New Haven, Hartford, and Stamford",primaryKeyword:"Amtrak station car service CT",intent:"Transactional",category:"cruise-train-connections"},
  {topic:"Connecticut Fall Foliage Tour by Private Chauffeur: Best Routes and Timing",primaryKeyword:"fall foliage tour CT",intent:"Informational",category:"tourism-day-trips"},
  {topic:"Ski Trip Transportation from CT: Getting to Vermont, New Hampshire, and Berkshires",primaryKeyword:"ski trip transportation CT",intent:"Transactional",category:"tourism-day-trips"},
  {topic:"Same-Day Car Service in Connecticut: Booking a Ride at the Last Minute",primaryKeyword:"same day car service CT",intent:"Transactional",category:"routes-destinations"},
  {topic:"Employee Shuttle Services in Connecticut: Corporate Commuter Solutions",primaryKeyword:"employee shuttle service CT",intent:"Commercial",category:"commuter-daily"},
  {topic:"Metro-North Train Station Car Service in CT: First and Last Mile Solved",primaryKeyword:"Metro-North car service CT",intent:"Transactional",category:"commuter-daily"},
  {topic:"Driving in a Connecticut Snowstorm? Why You Should Book a Chauffeur Instead",primaryKeyword:"snowstorm transportation CT",intent:"Informational",category:"emergency-weather"},
  {topic:"Flight Cancelled at JFK? How to Get Back to Connecticut Tonight",primaryKeyword:"flight cancelled JFK transportation CT",intent:"Transactional",category:"emergency-weather"},
  {topic:"Car Service from Connecticut to Westchester County NY",primaryKeyword:"CT to Westchester car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Connecticut to Boston Car Service: When Driving or Flying Isn't Worth It",primaryKeyword:"CT to Boston car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Car Service from CT to the Hamptons: Summer Weekend Transportation",primaryKeyword:"CT to Hamptons car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Professional Car Service vs Uber in Connecticut: The Real Comparison",primaryKeyword:"car service vs Uber CT",intent:"Comparison",category:"vehicle-guides"},
  {topic:"DUI Prevention: Book a Professional Ride Home in Connecticut",primaryKeyword:"DUI prevention car service CT",intent:"Informational",category:"emergency-weather"},
  {topic:"Connecticut's Most Popular Wedding Venues: A Transportation Planning Guide",primaryKeyword:"popular wedding venues CT",intent:"Informational",category:"ct-living"},
  {topic:"Best Things to Do in New Haven CT: A Local's Transportation Guide",primaryKeyword:"best things to do New Haven",intent:"Informational",category:"ct-living"},
  {topic:"Connecticut Wine Trail Guide: Every Vineyard and How to Tour Them",primaryKeyword:"Connecticut wine trail guide",intent:"Informational",category:"ct-living"},
  {topic:"Connecticut Casino Guide: Mohegan Sun vs Foxwoods — Getting There and Back",primaryKeyword:"Connecticut casino guide",intent:"Informational",category:"ct-living"},
  {topic:"Yale University Transportation in New Haven: Student, Parent, and Visitor Rides",primaryKeyword:"Yale University transportation CT",intent:"Transactional",category:"local-city-guides"},
  {topic:"College Graduation Transportation in Connecticut: Family Shuttle Planning",primaryKeyword:"college graduation transportation CT",intent:"Informational",category:"family-transportation"},
  {topic:"Funeral Transportation Services in Connecticut: What Families Should Expect",primaryKeyword:"funeral transportation CT",intent:"Informational",category:"specialty-accessible"},
  {topic:"Baby Shower Transportation in Connecticut: Group Ride Planning",primaryKeyword:"baby shower transportation CT",intent:"Informational",category:"family-transportation"},
  {topic:"How to Plan a 200-Person Connecticut Event Transportation Strategy",primaryKeyword:"how to plan event transportation CT",intent:"Informational",category:"prom-events"},
  {topic:"Real-Time Flight Tracking: How CT Car Services Know When You Land",primaryKeyword:"flight tracking car service CT",intent:"Informational",category:"safety-industry"},
  {topic:"Pet-Friendly Car Service in Connecticut: Traveling with Dogs and Cats",primaryKeyword:"pet friendly car service CT",intent:"Informational",category:"specialty-accessible"},
  {topic:"ADA-Accessible Transportation in CT: What to Ask Before Booking",primaryKeyword:"ADA accessible transportation CT",intent:"Informational",category:"specialty-accessible"},
  {topic:"Charity Gala Transportation in Fairfield County: Black Tie Logistics",primaryKeyword:"charity gala transportation CT",intent:"Commercial",category:"prom-events"},
  {topic:"Job Interview Transportation in Connecticut: Arrive Calm and On Time",primaryKeyword:"job interview transportation CT",intent:"Informational",category:"corporate-black-car"},
  {topic:"How to Book a Limo in Connecticut: Complete Step-by-Step Guide",primaryKeyword:"how to book a limo in CT",intent:"AEO",category:"cost-booking-guides"},
  {topic:"How to Choose Between Sedan, SUV, Limo, and Sprinter in CT",primaryKeyword:"how to choose limo vehicle CT",intent:"AEO",category:"vehicle-guides"},
  {topic:"How to Verify a Connecticut Limo Company's License and Insurance",primaryKeyword:"how to verify limo license CT",intent:"AEO",category:"safety-industry"},
  {topic:"Why CT Business Executives Switched from Rideshare to Black Car Permanently",primaryKeyword:"executive black car switch CT",intent:"Commercial",category:"corporate-black-car"},
  {topic:"What Happens When Your Flight Gets Delayed: How CT Car Services Handle It",primaryKeyword:"flight delay car service CT",intent:"Informational",category:"airport-transportation"},
  {topic:"Why Connecticut Seniors Prefer Professional Car Service Over Rideshare",primaryKeyword:"seniors car service vs rideshare CT",intent:"Commercial",category:"medical-senior"},
  {topic:"Best Transportation Companies in Connecticut: A Complete Guide",primaryKeyword:"best transportation companies in Connecticut",intent:"Commercial",category:"best-of-ct"},
  {topic:"Best Limo Services in CT: What Makes a Top-Tier Provider",primaryKeyword:"best limo services in CT",intent:"Commercial",category:"best-of-ct"},
  {topic:"Best Airport Car Services in Connecticut for 2026",primaryKeyword:"best airport car service Connecticut",intent:"Commercial",category:"best-of-ct"},
  {topic:"Best Wedding Transportation Companies in CT",primaryKeyword:"best wedding transportation companies CT",intent:"Commercial",category:"best-of-ct"},
  {topic:"Best Black Car Services in Connecticut: Executive Picks",primaryKeyword:"best black car services in Connecticut",intent:"Commercial",category:"best-of-ct"},
  {topic:"New Haven to JFK Airport: Complete Car Service Guide",primaryKeyword:"New Haven to JFK car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Stamford to JFK Airport: Best Routes, Times, and Car Service Options",primaryKeyword:"Stamford to JFK car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Hartford to JFK Airport: Why a Private Car Beats Driving Yourself",primaryKeyword:"Hartford to JFK car service",intent:"Transactional",category:"routes-destinations"},
  {topic:"Greenwich to Manhattan: Executive Black Car Commute",primaryKeyword:"Greenwich to Manhattan car service",intent:"Transactional",category:"corporate-black-car"},
  {topic:"Car Service to Mohegan Sun Casino from Anywhere in CT",primaryKeyword:"car service to Mohegan Sun CT",intent:"Transactional",category:"tourism-day-trips"},
  {topic:"Car Service to Foxwoods Resort Casino from Connecticut",primaryKeyword:"car service to Foxwoods CT",intent:"Transactional",category:"tourism-day-trips"},
  {topic:"Law Firm Car Service in Connecticut: Client Meetings and Court Appearances",primaryKeyword:"law firm car service CT",intent:"Commercial",category:"industry-partnerships"},
  {topic:"Hedge Fund and Financial Services Transportation in Greenwich and Stamford",primaryKeyword:"financial services transportation CT",intent:"Commercial",category:"industry-partnerships"},
  {topic:"Hospital and Healthcare Staff Transportation in CT",primaryKeyword:"healthcare staff transportation CT",intent:"Commercial",category:"industry-partnerships"},
  {topic:"Connecticut Thanksgiving Travel: Airport and Family Transportation Planning",primaryKeyword:"Thanksgiving transportation CT",intent:"Informational",category:"emergency-weather"},
  {topic:"Fourth of July Transportation in CT: Fireworks, Beaches, and BBQs",primaryKeyword:"July 4th transportation CT",intent:"Informational",category:"ct-living"},
  {topic:"High School Sports Tournament Transportation in CT for Team Parents",primaryKeyword:"sports tournament transportation CT",intent:"Informational",category:"prom-events"},
  {topic:"Connecticut Marathon and Race Day Transportation for Runners and Spectators",primaryKeyword:"marathon transportation CT",intent:"Informational",category:"ct-living"},
  {topic:"How AI Is Changing the Way Connecticut Residents Book Transportation",primaryKeyword:"AI transportation booking CT",intent:"Informational",category:"ct-living"},
  {topic:"Electric and Hybrid Limo Fleet in Connecticut: What's Available in 2026",primaryKeyword:"electric limo fleet CT 2026",intent:"Informational",category:"vehicle-guides"},
  {topic:"Long Distance Car Service from CT to NYC for Work and Events",primaryKeyword:"long distance car service from CT to NYC",intent:"Transactional",category:"corporate-black-car"},
  {topic:"CT Wedding Transportation Timeline: Ceremony to After-Party",primaryKeyword:"Connecticut wedding transportation timeline",intent:"Informational",category:"wedding-transportation"},
  {topic:"Safe Prom Transportation in Connecticut: Questions Every Parent Should Ask",primaryKeyword:"safe prom transportation Connecticut",intent:"Informational",category:"prom-events"},
];

// ---- helpers ----

function apiCall(opts, body) {
  return new Promise((res, rej) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = https.request(opts, r => {
      let out = '';
      r.on('data', c => out += c);
      r.on('end', () => {
        try { res({status: r.statusCode, body: JSON.parse(out)}); }
        catch(e) { res({status: r.statusCode, body: out}); }
      });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}

function fixMultilineJSON(str) {
  let result = '', inString = false, escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\') { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }
  return result;
}

function getETHourMinute() {
  const etStr = new Date().toLocaleString('en-US', {timeZone:'America/New_York'});
  const d = new Date(etStr);
  return [d.getHours(), d.getMinutes()];
}

// ---- publisher ----

async function publish() {
  const topicData = TOPICS[Math.floor(Date.now() / 86400000) % TOPICS.length];
  console.log(`[${new Date().toISOString()}] PUBLISHING: ${topicData.topic}`);

  if (!ANTHROPIC_KEY) { console.error('ANTHROPIC_API_KEY not set'); return; }

  const prompt = `You are an expert SEO and AI Overview content writer for Absolute Transportation, Connecticut's leading ground transportation company based in North Haven. Absolute Transportation provides every form of chauffeured ground transportation in Connecticut — airport transfers, corporate black car, wedding fleets, prom limos, medical and senior rides, family transportation with car seats, group shuttles, party buses, Sprinter vans, cruise port transfers, train station pickups, long-distance interstate rides, commuter services, and tourism tours. Serves all CT counties with routes to JFK, LGA, EWR, BDL, HPN, HVN.

Write a comprehensive, AI-Overview-optimized blog post about: "${topicData.topic}"
PRIMARY KEYWORD: "${topicData.primaryKeyword}"
SEARCH INTENT: "${topicData.intent}"
BLOG CATEGORY: "${topicData.category}"
WORD TARGET: 1,400-1,800 words

STRUCTURE REQUIREMENTS:
1. H1: Near-exact match to the primary keyword
2. Answer Block: Immediately after H1, wrap in <div class="answer-block"><p><strong>...</strong></p></div>. Write a 40-60 word direct answer. Mention Absolute Transportation by name. Include at least one CT city and one airport code (BDL, JFK, LGA, EWR, HPN, or HVN) if relevant.
3. Body: 1,400-1,800 words with H2 and H3 subheadings. Each section should be a self-contained 134-167 word passage.
4. Trust Section: One H2 section covering licensing, insurance, DOT compliance, or chauffeur professionalism.
5. FAQ Section: <div class="faq-section"><h2>Frequently Asked Questions</h2>...</div> with 4-6 H3 questions + P answers (40-60 words each, start with direct statement).
6. CTA: Final paragraph with clear call to action to book with Absolute Transportation.
7. Author: <div class="author-byline"><p><strong>Written by the Absolute Transportation Team</strong>, Connecticut's leading ground transportation provider with over a decade of experience serving all of CT. <a href="https://www.absolute-transportation.com/about">Learn more about us</a>.</p></div>

SEO: Meta title under 70 chars. Meta description 140-155 chars. Short hyphenated slug. Mention Absolute Transportation 5+ times. Integrate CT cities: Stamford, Greenwich, Norwalk, Westport, New Haven, Hartford, Bridgeport. Use airport codes where relevant. HTML ONLY — no markdown.

Return ONLY valid JSON (no markdown fences):
{"title":"...","slug":"...","metaDescription":"...","category":"${topicData.category}","tags":["tag1","tag2","tag3","tag4","tag5"],"content":"<h2>...</h2><p>...</p>...","faqItems":[{"question":"...","answer":"..."}]}`;

  const claudeBody = JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:8192,messages:[{role:'user',content:prompt}]});
  const cr = await apiCall({
    hostname:'api.anthropic.com',path:'/v1/messages',method:'POST',
    headers:{'x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','content-type':'application/json','content-length':Buffer.byteLength(claudeBody)}
  }, claudeBody);

  if (!cr.body.content) { console.error('Claude error:', JSON.stringify(cr.body).slice(0,300)); return; }

  let text = cr.body.content[0].text.replace(/^```json\s*/i,'').replace(/\s*```$/i,'').trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch(e1) {
    try { parsed = JSON.parse(fixMultilineJSON(text)); }
    catch(e2) {
      const m = text.match(/\{[\s\S]+\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch(e3) { try { parsed = JSON.parse(fixMultilineJSON(m[0])); } catch(e4) { console.error('Parse failed:', text.slice(0,300)); return; } }
      } else { console.error('No JSON found'); return; }
    }
  }
  console.log('✓ Claude: "'+parsed.title+'" | faq='+(parsed.faqItems||[]).length);

  // Schemas
  const articleSchema = {"@context":"https://schema.org","@type":"Article","headline":parsed.title,"description":parsed.metaDescription,"author":{"@type":"Organization","name":"Absolute Transportation","url":"https://www.absolute-transportation.com"},"publisher":{"@type":"Organization","name":"Absolute Transportation","logo":{"@type":"ImageObject","url":"https://www.absolute-transportation.com/logo.png"}},"datePublished":new Date().toISOString().split('T')[0],"dateModified":new Date().toISOString().split('T')[0]};
  const faqSchema = (parsed.faqItems||[]).length ? {"@context":"https://schema.org","@type":"FAQPage","mainEntity":(parsed.faqItems||[]).map(f=>({"@type":"Question","name":f.question,"acceptedAnswer":{"@type":"Answer","text":f.answer}}))} : null;
  const lbSchema = {"@context":"https://schema.org","@type":["LimousineBus","LocalBusiness"],"name":"Absolute Transportation","url":"https://www.absolute-transportation.com","telephone":"+1-203-938-2000","address":{"@type":"PostalAddress","addressLocality":"North Haven","addressRegion":"CT","postalCode":"06473","addressCountry":"US"},"areaServed":["Connecticut","New Haven County","Fairfield County","Hartford County"],"openingHours":"Mo-Su 00:00-23:59","priceRange":"$$"};

  let content = (parsed.content||'')
    .replace(/\{\{SERVICE_PAGE_LINK\}\}/g,'https://www.absolute-transportation.com/services')
    .replace(/\{\{CITY_PAGE_LINK\}\}/g,'https://www.absolute-transportation.com/service-areas')
    .replace(/\{\{BOOKING_LINK\}\}/g,'https://www.absolute-transportation.com/contact');

  if (!content.includes('wp-image-47')) {
    const h1End = content.indexOf('</h1>');
    if (h1End !== -1) {
      const img = '\n<figure class="wp-block-image size-large"><img src="https://wordpress-production-91c8.up.railway.app/wp-content/uploads/absolute-transportation-featured.jpg" alt="'+parsed.title+'" class="wp-image-47" /></figure>\n';
      content = content.slice(0,h1End+5)+img+content.slice(h1End+5);
    }
  }

  const schemas = [
    '<script type="application/ld+json">'+JSON.stringify(articleSchema)+'</script>',
    faqSchema ? '<script type="application/ld+json">'+JSON.stringify(faqSchema)+'</script>' : '',
    '<script type="application/ld+json">'+JSON.stringify(lbSchema)+'</script>'
  ].filter(Boolean).join('\n');
  const finalContent = schemas + '\n' + content;
  const wpCatId = WP_CATS[parsed.category] || 3;

  // Check slug uniqueness
  const slugCheck = await apiCall({
    hostname:WP_URL, path:'/wp-json/wp/v2/posts?slug='+encodeURIComponent(parsed.slug)+'&status=publish',
    method:'GET', headers:{'Authorization':WP_AUTH}
  });
  if (Array.isArray(slugCheck.body) && slugCheck.body.length > 0) {
    parsed.slug = parsed.slug + '-' + new Date().toISOString().slice(0,10);
    console.log('Slug existed, appended date: '+parsed.slug);
  }

  const wpPayload = JSON.stringify({
    title:parsed.title, content:finalContent, status:'publish',
    slug:parsed.slug, excerpt:parsed.metaDescription,
    categories:[wpCatId], featured_media:47
  });
  const wpr = await apiCall({
    hostname:WP_URL, path:'/wp-json/wp/v2/posts', method:'POST',
    headers:{'Authorization':WP_AUTH,'Content-Type':'application/json','content-length':Buffer.byteLength(wpPayload)}
  }, wpPayload);

  if (wpr.status === 201) {
    console.log('✅ Published! WP ID:', wpr.body.id, '| URL:', wpr.body.link);
  } else {
    console.error('WP publish failed:', wpr.status, JSON.stringify(wpr.body).slice(0,300));
  }
}

// ---- scheduler ----

let lastFiredKey = null;

function checkAndFire() {
  const [h, m] = getETHourMinute();
  for (const [fh, fm] of FIRE_TIMES_ET) {
    if (h === fh && m === fm) {
      const key = `${h}:${String(m).padStart(2,'0')}-${new Date().toISOString().slice(0,10)}`;
      if (key !== lastFiredKey) {
        lastFiredKey = key;
        console.log(`[CRON] Firing at ET ${h}:${String(m).padStart(2,'0')} (key=${key})`);
        publish().catch(e => console.error('Publish error:', e.message));
      }
      return;
    }
  }
}

console.log(`[${new Date().toISOString()}] Blog cron publisher started. Fires at 7:00, 13:00, 20:46 ET.`);
console.log(`ANTHROPIC_API_KEY set: ${!!ANTHROPIC_KEY}`);
checkAndFire(); // check immediately on startup
setInterval(checkAndFire, 60 * 1000);
