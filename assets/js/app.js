const hashtagsData = {
    en: "#CORTIS #코르티스",
    kr: "#CORTIS #코르티스"
};

// ===== ÂM THANH KHI BẤM NÚT COPY =====
// Đổi tên file ở đây cho đúng với file audio của bạn (để trong thư mục assets/audio/)
const COPY_SOUND_URL = "assets/audio/wink.mp4";
const copySoundEl = new Audio(COPY_SOUND_URL);
copySoundEl.preload = 'auto'; // tải sẵn, bấm là kêu ngay

function playCopySound() {
    try {
        copySoundEl.currentTime = 0;
        const p = copySoundEl.play();
        if (p !== undefined) p.catch(() => { }); // trình duyệt chặn hoặc thiếu file thì bỏ qua, không ảnh hưởng chức năng copy
    } catch (e) { }
}

const poyoiyoiAudios = [
    "assets/audio/2.mp3",
    "assets/audio/3.mp3",
    "assets/audio/4.mp3",
    "assets/audio/5.mp3",
    "assets/audio/6.mp3",
    "assets/audio/7.mp3",
    "assets/audio/8.mp3",
    "assets/audio/9.mp3",
    "assets/audio/10.mp3",
    "assets/audio/11.mp3",
    "assets/audio/12.mp3",
    "assets/audio/13.mp3",
    "assets/audio/14.mp3",
    "assets/audio/15.mp3",
    "assets/audio/16.mp3",
    "assets/audio/17.mp3",
    "assets/audio/18.mp3",
    "assets/audio/19.mp3",
    "assets/audio/20.mp3",
    "assets/audio/21.mp3",
    "assets/audio/22.mp3",
    "assets/audio/23.mp3",
    "assets/audio/24.mp3",
    "assets/audio/25.mp3",
    "assets/audio/26.mp3",
    "assets/audio/27.mp3",
    "assets/audio/28.mp3",
    "assets/audio/29.mp3",
    "assets/audio/30.mp3",
    "assets/audio/31.mp3",
    "assets/audio/32.mp3",
    "assets/audio/33.mp3",
    "assets/audio/34.mp3",
    "assets/audio/35.mp3",
    "assets/audio/36.mp3",
    "assets/audio/37.mp3",
    "assets/audio/38.mp3",
    "assets/audio/39.mp3",
    "assets/audio/40.mp3",
    "assets/audio/41.mp3",
    "assets/audio/42.mp3",
    "assets/audio/43.mp3"
];

// Poyoiyoi Cute Dialogues
const poyoiyoiQuotes = [
    "Poyoiyoi! Chăm chỉ vì CORTIS nha Coer! 🍀",
    "Poyoiyoiii~ CORTIS no.1 trong tim tui! ✨🌟",
    "Ball Cortis đây! Cố lên nha Coer iu dấu! 💚",
    "Poyoiyoi! Mỗi bài đăng đều giúp CORTIS tỏa sáng! 🚀",
    "Poyoiyoi poyoiyoi! Hôm nay BR đỉnh nóc kịch trần luôn á! 💌",
    "Đừng quên nghỉ ngơi và uống nhiều nước nha! 💚🍀"
];

// ==========================================
// ⚙️ STATE MANAGEMENT
// ==========================================
let currentLang = null;
let currentCaptionText = "";
let currentCaptionRef = null;   // tham chiếu document Firestore của câu đang hiển thị
let currentCaptionLang = null;  // ngôn ngữ của câu đang hiển thị
let isCopying = false;          // khóa chống bấm Copy liên tiếp

// Khai báo 2 "túi" để đựng caption đã xáo trộn cho tiếng Anh và Hàn
let shuffledCaptions = { en: [], kr: [] };

// DOM Elements
const welcomePlaceholder = document.getElementById('welcomePlaceholder');
const captionWorkspace = document.getElementById('captionWorkspace');
const captionTextEl = document.getElementById('captionText');
const captionHashtagsEl = document.getElementById('captionHashtags');
const captionBoxEl = document.getElementById('captionBox');
const copyCounterEl = document.getElementById('copyCounter');
const cuteToastEl = document.getElementById('cuteToast');
const toastMsgEl = document.getElementById('toastMsg');
const eyesOpenSvg = document.getElementById('eyesOpen');
const eyesWinkSvg = document.getElementById('eyesWink');
const copyBtn = document.getElementById('copyBtn');
const poyoiyoiBtn = document.getElementById('poyoiyoiBtn');
const speechTextEl = document.getElementById('speechText');

// Biến lưu trữ số lượng tồn kho
let stockEN = 0;
let stockKR = 0;

// Đếm số caption chưa dùng. Ưu tiên count() (chỉ tính 1 lượt đọc), nếu SDK không hỗ trợ thì đọc cách cũ.
async function countUnused(lang) {
    const q = db.collection('captions').where('lang', '==', lang).where('isUsed', '==', false);
    if (typeof q.count === 'function') {
        try {
            const agg = await q.count().get();
            return agg.data().count;
        } catch (err) {
            console.warn('count() không dùng được, đọc cách cũ:', err);
        }
    }
    const snap = await q.get();
    return snap.size;
}

// Chạy ngầm, 2 ngôn ngữ đếm song song
function initStockCounters() {
    setTimeout(async () => {
        try {
            const [en, kr] = await Promise.all([countUnused('en'), countUnused('kr')]);
            stockEN = en;
            stockKR = kr;
            const enEl = document.getElementById('stock-en');
            const krEl = document.getElementById('stock-kr');
            if (enEl) enEl.innerText = stockEN;
            if (krEl) krEl.innerText = stockKR;
        } catch (err) {
            console.error("Lỗi đếm số dư caption:", err);
        }
    }, 600);
}

// Hàm trừ đi 1 ở giao diện mỗi khi có 1 caption bị lấy ra
function deductStockLocal(lang) {
    if (lang === 'en' && stockEN > 0) {
        stockEN--;
        if (document.getElementById('stock-en')) document.getElementById('stock-en').innerText = stockEN;
    } else if (lang === 'kr' && stockKR > 0) {
        stockKR--;
        if (document.getElementById('stock-kr')) document.getElementById('stock-kr').innerText = stockKR;
    }
}

// ==========================================
// ⚙️ REAL-TIME CAPTION SYSTEM (FIREBASE)
// ==========================================

// 1. Hàm xử lý khi người dùng bấm chọn ngôn ngữ
function setLanguage(lang) {
    if (currentLang === lang) return;
    currentLang = lang;

    // Cập nhật trạng thái đổi màu nút bấm
    document.getElementById('btn-lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-lang-kr').classList.toggle('active', lang === 'kr');

    // Ẩn lời chào, hiện khung caption
    if (welcomePlaceholder) welcomePlaceholder.style.display = 'none';
    if (captionWorkspace) captionWorkspace.style.display = 'flex';

    // Chỉnh font nếu là tiếng Hàn
    if (lang === 'kr') {
        captionTextEl.classList.add('lang-kr');
    } else {
        captionTextEl.classList.remove('lang-kr');
    }

    // Rút ngay 1 câu từ Firebase
    pickRandomOtherCaption(false);
}

// 2. Hàm bốc caption (CHỈ ĐỌC, chưa đánh dấu isUsed). Câu chỉ bị "trừ" khi người dùng copy thành công.
async function fetchNextUniqueCaption(lang, excludeId = null) {
    const snapshot = await db.collection('captions')
        .where('lang', '==', lang)
        .where('isUsed', '==', false)
        .limit(30)
        .get();

    const docs = snapshot.docs.filter(d => d.id !== excludeId);
    if (docs.length === 0) return null;

    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    return { text: randomDoc.data().text, ref: randomDoc.ref, lang: lang };
}

// 2b. Đánh dấu isUsed = true SAU KHI copy thành công, rồi mới trừ số "Còn lại"
async function claimCaption(ref, lang) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            let claimed = false;
            await db.runTransaction(async (transaction) => {
                claimed = false;
                const snap = await transaction.get(ref);
                if (!snap.exists || snap.data().isUsed) return; // đã có người khác lấy trước
                transaction.update(ref, { isUsed: true });
                claimed = true;
            });
            if (claimed) deductStockLocal(lang);
            return;
        } catch (err) {
            console.warn('Đánh dấu isUsed lỗi, thử lại:', err);
        }
    }
}

async function checkStock(lang) {
    const snap = await db.collection('captions').where('lang', '==', lang).where('isUsed', '==', false).limit(1).get();
    return !snap.empty;
}

// 3. Hàm điều khiển hiển thị caption & Bắt lỗi (ĐÃ SỬA LỖI TREO MÀN HÌNH)
async function pickRandomOtherCaption(animate = true, prefetch = null) {
    if (!currentLang) return;

    currentCaptionRef = null; // đang tải thì chưa cho copy
    const requestLang = currentLang;
    const usePrefetch = prefetch && prefetch.lang === requestLang;

    // Có sẵn câu tải trước thì giữ nguyên màn hình, không chớp chữ "đang bốc"
    if (!usePrefetch) {
        captionTextEl.classList.add('out-of-stock');
        captionTextEl.innerText = "⏳ Hệ thống đang bốc caption duy nhất...";
        captionHashtagsEl.innerText = ""; // Tạm ẩn hashtag lúc đang tải
    }

    try {
        const picked = usePrefetch ? await prefetch.promise : await fetchNextUniqueCaption(requestLang);

        // Người dùng đã đổi ngôn ngữ trong lúc đang tải -> bỏ kết quả cũ
        if (requestLang !== currentLang) return;

        if (!picked) {
            const otherLang = currentLang === 'en' ? 'kr' : 'en';
            const otherLangName = otherLang === 'en' ? 'Tiếng Anh' : 'Tiếng Hàn';
            const currentLangName = currentLang === 'en' ? 'Tiếng Anh' : 'Tiếng Hàn';

            const otherStillHasStock = await checkStock(otherLang);
            captionTextEl.classList.add('out-of-stock');
            if (otherStillHasStock) {
                captionTextEl.innerText = `⚠️ Kho ${currentLangName} đã hết!\n👉 Bạn hãy chuyển qua lấy ${otherLangName} nhé!`;
            } else {
                captionTextEl.innerHTML = '🚨 Kho caption đã cạn kiệt!<br>📩 Vui lòng liên hệ <a href="https://www.facebook.com/pthh.uaoong.26" class="contact-link">Nguyễn Phương Thảo</a> để cập nhật thêm.';
            }

            currentCaptionText = "";
            captionHashtagsEl.innerText = ""; // XÓA SẠCH HASHTAG KHI HIỆN THÔNG BÁO HẾT
            if (copyBtn) copyBtn.style.display = 'none';
            return;
        }
        captionTextEl.classList.remove('out-of-stock');

        if (copyBtn) copyBtn.style.display = 'flex';
        currentCaptionText = picked.text;
        currentCaptionRef = picked.ref;
        currentCaptionLang = picked.lang;
        if (animate) animateCaptionSwitch();
        else renderCaption();

    } catch (error) {
        // NẾU CÓ LỖI MẠNG HOẶC FIREBASE, HIỂN THỊ THẲNG RA MÀN HÌNH CHỐNG TREO
        captionTextEl.classList.add('out-of-stock');
        captionTextEl.innerHTML = `❌ Lỗi kết nối hoặc Firebase quá tải:<br><span style="font-size: 14px; color: #d32f2f;">${error.message}</span><br>Vui lòng F5 thử lại!`;
        currentCaptionText = "";
        captionHashtagsEl.innerText = "";
        if (copyBtn) copyBtn.style.display = 'none';
        console.error("Lỗi lấy caption:", error);
    } finally {
        isCopying = false;
    }
}

function animateCaptionSwitch() {
    captionBoxEl.classList.add('fading');
    setTimeout(() => {
        renderCaption();
        captionBoxEl.classList.remove('fading');
    }, 220);
}

// 4. Hàm Render Giao diện (Đảm bảo chỉ hiện 2 tag)
function renderCaption() {
    if (!currentLang) return;
    captionTextEl.innerText = currentCaptionText;
    captionHashtagsEl.innerText = hashtagsData[currentLang] || "#CORTIS #코르티스"; // Hiển thị lại 2 tag khi có caption
}

// ==========================================
// 🌸 DYNAMIC SCALLOPED CLOUD FRAME GENERATOR
// ==========================================
function updateScallopFrame() {
    const card = document.getElementById('scallopCard');
    const svg = document.getElementById('scallopBgSvg');
    const pathOuter = document.getElementById('scallopPathOuter');
    const pathDashed = document.getElementById('scallopPathDashed');
    if (!card || !svg || !pathOuter) return;

    const w = card.offsetWidth;
    const h = card.offsetHeight;
    if (w <= 0 || h <= 0) return;

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const r = 26;
    const bump = 5;

    // Top edge
    const lx = w - 2 * r;
    const nx = Math.max(3, Math.round(lx / 22));
    const dx = lx / nx;

    let d = `M ${r} 0`;
    for (let i = 0; i < nx; i++) {
        const xMid = r + i * dx + dx / 2;
        const xEnd = r + (i + 1) * dx;
        d += ` Q ${xMid} ${-bump} ${xEnd} 0`;
    }

    // Top-Right Corner
    d += ` A ${r} ${r} 0 0 1 ${w} ${r}`;

    // Right edge
    const ly = h - 2 * r;
    const ny = Math.max(3, Math.round(ly / 22));
    const dy = ly / ny;
    for (let i = 0; i < ny; i++) {
        const yMid = r + i * dy + dy / 2;
        const yEnd = r + (i + 1) * dy;
        d += ` Q ${w + bump} ${yMid} ${w} ${yEnd}`;
    }

    // Bottom-Right Corner
    d += ` A ${r} ${r} 0 0 1 ${w - r} ${h}`;

    // Bottom edge
    for (let i = 0; i < nx; i++) {
        const xMid = w - r - i * dx - dx / 2;
        const xEnd = w - r - (i + 1) * dx;
        d += ` Q ${xMid} ${h + bump} ${xEnd} ${h}`;
    }

    // Bottom-Left Corner
    d += ` A ${r} ${r} 0 0 1 0 ${h - r}`;

    // Left edge
    for (let i = 0; i < ny; i++) {
        const yMid = h - r - i * dy - dy / 2;
        const yEnd = h - r - (i + 1) * dy;
        d += ` Q ${-bump} ${yMid} 0 ${yEnd}`;
    }

    // Top-Left Corner
    d += ` A ${r} ${r} 0 0 1 ${r} 0 Z`;

    pathOuter.setAttribute('d', d);

    if (pathDashed) {
        const inR = 18;
        const pad = 10;
        const inD = `M ${pad + inR} ${pad} L ${w - pad - inR} ${pad} A ${inR} ${inR} 0 0 1 ${w - pad} ${pad + inR} L ${w - pad} ${h - pad - inR} A ${inR} ${inR} 0 0 1 ${w - pad - inR} ${h - pad} L ${pad + inR} ${h - pad} A ${inR} ${inR} 0 0 1 ${pad} ${h - pad - inR} L ${pad} ${pad + inR} A ${inR} ${inR} 0 0 1 ${pad + inR} ${pad} Z`;
        pathDashed.setAttribute('d', inD);
    }
}

let scallopRaf = null;
function scheduleScallopUpdate() {
    if (scallopRaf) return;
    scallopRaf = requestAnimationFrame(() => {
        scallopRaf = null;
        updateScallopFrame();
    });
}

window.addEventListener('resize', scheduleScallopUpdate);

// ==========================================
// 3. COPY BUTTON & BURST PARTICLES
// ==========================================
// Copy vào clipboard, trả về true/false để biết có thật sự copy được hay không
async function copyTextToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('Clipboard API lỗi, thử cách dự phòng:', err);
    }
    try {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, tempInput.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(tempInput);
        return ok;
    } catch (err) {
        return false;
    }
}

async function handleCopyClick() {
    // Chỉ cho copy khi đã có caption thật (không copy chữ "đang bốc...") và không đang xử lý
    if (!currentLang || !currentCaptionRef || isCopying) return;
    isCopying = true;

    const ref = currentCaptionRef;
    const lang = currentCaptionLang;
    const fullTextToCopy = `${captionTextEl.innerText}\n\n${captionHashtagsEl.innerText}`;

    // 1. Copy to clipboard (phải làm đầu tiên để trình duyệt còn "cử chỉ bấm" của người dùng)
    const copied = await copyTextToClipboard(fullTextToCopy);
    if (!copied) {
        // Copy thất bại: KHÔNG trừ câu, KHÔNG đếm, KHÔNG đổi câu
        showToast('Chưa copy được, bạn bấm lại nha 🥲');
        isCopying = false;
        return;
    }

    // Copy thành công -> phát tiếng ngay
    playCopySound();

    // Copy thành công -> khóa câu này lại và đánh dấu isUsed trên Firebase
    currentCaptionRef = null;
    const claimPromise = claimCaption(ref, lang);

    // Tải sẵn câu kế tiếp ngay lúc này (chạy song song với hiệu ứng 1 giây) để đỡ phải chờ
    const nextPromise = fetchNextUniqueCaption(lang, ref.id);
    nextPromise.catch(() => { }); // lỗi (nếu có) sẽ được xử lý khi đến lượt dùng

    // 2. Animal wink effect for 1 second
    eyesOpenSvg.style.display = 'none';
    eyesWinkSvg.style.display = 'block';
    copyBtn.style.transform = 'scale(0.96)';

    setTimeout(() => {
        eyesOpenSvg.style.display = 'block';
        eyesWinkSvg.style.display = 'none';
        copyBtn.style.transform = '';
    }, 1000);

    // 3. Burst member emojis outward from the copy button
    burstAnimalEmojis();

    // 4. Show Toast Notification
    showToast('Đã copy! 🍀');

    // 5. Cập nhật đếm số và kiểm tra mốc chuỗi ngày
    const streakData = incrementDailyCounter();
    if (streakData.isMilestone) {
        // Nếu đạt mốc (5,10,15...), trễ 0.8s cho bay icon xong rồi hiện popup
        setTimeout(() => {
            showMilestoneModal(streakData.streak);
        }, 800);
    }

    // 6. After 1 second, automatically transition to another random caption
    setTimeout(async () => {
        await claimPromise; // đảm bảo câu cũ đã được đánh dấu xong
        pickRandomOtherCaption(true, { lang: lang, promise: nextPromise });
    }, 1000);
}

// Burst member emojis: 🐶 (Dog), 🦊 (Fox), 🦅 (Eagle), 🦒 (Giraffe), 🐢 (Turtle)
function burstAnimalEmojis() {
    const emojis = ['🐶', '🦊', '🦅', '🦒', '🐢', '🍀', '✨'];
    const rect = copyBtn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const count = 14;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'burst-particle';
        particle.innerText = emojis[i % emojis.length];

        const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
        const distance = 80 + Math.random() * 90;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 25;
        const rot = (Math.random() - 0.5) * 70;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--rot', `${rot}deg`);
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        document.body.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1300);
    }
}

// ==========================================
// 🍞 TOAST NOTIFICATION
// ==========================================
let toastTimeout = null;
function showToast(msg) {
    toastMsgEl.innerText = msg;
    cuteToastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        cuteToastEl.classList.remove('show');
    }, 2200);
}

// ==========================================
// 4. ADVANCED COUNTER & STREAK SYSTEM
// ==========================================
const DATE_KEY = 'cloveris_br_date_record';
const DAILY_COUNT_KEY = 'cloveris_br_count_record';
const TOTAL_COUNT_KEY = 'cloveris_br_total_count';
const STREAK_KEY = 'cloveris_br_streak';
const LAST_STREAK_DATE_KEY = 'cloveris_br_last_streak_date';
const LANG_COUNT_EN_KEY = 'cloveris_br_lang_en_count';
const LANG_COUNT_KR_KEY = 'cloveris_br_lang_kr_count';

// Hàm lấy chuỗi ngày hiện tại (YYYY-MM-DD)
function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Hàm kiểm tra xem ngày d1 có đúng là NGÀY HÔM QUA so với d2 không
function isYesterday(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return false;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

function initDailyCounter() {
    const today = getTodayString();
    const storedDate = localStorage.getItem(DATE_KEY);
    const lastStreakDate = localStorage.getItem(LAST_STREAK_DATE_KEY);

    let dailyCount = parseInt(localStorage.getItem(DAILY_COUNT_KEY) || '0', 10);
    let totalCount = parseInt(localStorage.getItem(TOTAL_COUNT_KEY) || '0', 10);
    let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

    if (storedDate !== today) {
        dailyCount = 0;
    }
    if (lastStreakDate && lastStreakDate !== today && !isYesterday(lastStreakDate, today)) {
        streak = 0;
        localStorage.setItem(STREAK_KEY, '0');
    }

    copyCounterEl.innerText = dailyCount;
    document.getElementById('totalCount').innerText = totalCount;
    document.getElementById('streakCount').innerText = streak;
}

function incrementDailyCounter() {
    const today = getTodayString();
    const storedDate = localStorage.getItem(DATE_KEY);
    const lastStreakDate = localStorage.getItem(LAST_STREAK_DATE_KEY);

    let dailyCount = parseInt(localStorage.getItem(DAILY_COUNT_KEY) || '0', 10);
    let totalCount = parseInt(localStorage.getItem(TOTAL_COUNT_KEY) || '0', 10);
    let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

    totalCount++;
    localStorage.setItem(TOTAL_COUNT_KEY, totalCount.toString());
    document.getElementById('totalCount').innerText = totalCount;

    if (storedDate !== today) {
        dailyCount = 1;
        localStorage.setItem(DATE_KEY, today);
    } else {
        dailyCount++;
    }
    localStorage.setItem(DAILY_COUNT_KEY, dailyCount.toString());
    copyCounterEl.innerText = dailyCount;

    let justHitMilestone = false;
    if (lastStreakDate !== today) {
        if (!lastStreakDate || isYesterday(lastStreakDate, today)) streak++;
        else streak = 1;

        localStorage.setItem(STREAK_KEY, streak.toString());
        localStorage.setItem(LAST_STREAK_DATE_KEY, today);
        document.getElementById('streakCount').innerText = streak;

        if (streak > 0 && streak % 5 === 0) justHitMilestone = true;
    }

    return { streak: streak, isMilestone: justHitMilestone };
}

// Hàm mở Popup chúc mừng
function showMilestoneModal(streakNum) {
    document.getElementById('milestoneNumber').innerText = streakNum;
    const modal = document.getElementById('milestoneModal');
    modal.classList.add('show');

    // Phát âm thanh
    try {
        const audio = document.getElementById('milestoneAudioPlayer');
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Trình duyệt chặn tự động phát âm thanh:', e));
    } catch (err) { }
}

// Hàm đóng Popup
function closeMilestoneModal() {
    const modal = document.getElementById('milestoneModal');
    modal.classList.remove('show');
    try {
        document.getElementById('milestoneAudioPlayer').pause();
    } catch (err) { }
}

// ==========================================
// 5. POYOIYOI MASCOT (AUDIO & QUOTES)
// ==========================================
let shuffledAudios = []; // Khai báo biến lưu danh sách xáo trộn

function handlePoyoiyoiClick() {
    // 1. Jiggle animation
    poyoiyoiBtn.classList.remove('jiggle');
    void poyoiyoiBtn.offsetWidth;
    poyoiyoiBtn.classList.add('jiggle');

    // 2. Speech bubble random quote
    const randomQuote = poyoiyoiQuotes[Math.floor(Math.random() * poyoiyoiQuotes.length)];
    speechTextEl.innerText = randomQuote;

    // 3. Floating music notes
    spawnAudioNotes();

    // 4. Play audio từ danh sách đã xáo trộn
    playPoyoiyoiSound();
}

// Hàm xáo trộn danh sách (Fisher-Yates Shuffle)
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

let poyoiyoiPrefetchEl = null;
// Tải trước file âm thanh sẽ phát ở lần bấm kế tiếp -> bấm là có tiếng ngay, không chờ mạng
function prefetchNextPoyoiyoiAudio() {
    try {
        if (!poyoiyoiAudios || poyoiyoiAudios.length === 0) return;
        if (shuffledAudios.length === 0) shuffledAudios = shuffleArray([...poyoiyoiAudios]);
        const next = shuffledAudios[shuffledAudios.length - 1];
        poyoiyoiPrefetchEl = new Audio();
        poyoiyoiPrefetchEl.preload = 'auto';
        poyoiyoiPrefetchEl.src = next;
    } catch (e) { }
}

let poyoiyoiPlayToken = 0; // mỗi lần bấm 1 token, tránh các lần thử lại đè lên nhau

function playPoyoiyoiSound(retry = 0) {
    if (!poyoiyoiAudios || poyoiyoiAudios.length === 0) return;

    // Nếu đã phát hết (hoặc chưa phát lần nào), nạp lại và xáo trộn 1 vòng mới
    if (shuffledAudios.length === 0) {
        shuffledAudios = shuffleArray([...poyoiyoiAudios]);
    }

    const audioUrl = shuffledAudios.pop();
    const player = document.getElementById('poyoiyoiAudioPlayer');
    const myToken = ++poyoiyoiPlayToken;

    // Nếu file này lỗi/không tải được -> tự nhảy sang file kế tiếp, người dùng không bị "im lặng"
    const skipToNext = (reason) => {
        if (myToken !== poyoiyoiPlayToken) return; // đã có lần bấm/lần thử mới hơn
        console.warn(`🔇 Poyoiyoi: file lỗi "${audioUrl}" (${reason}) -> thử file khác`);
        if (retry < 5) playPoyoiyoiSound(retry + 1);
    };

    console.log('🔊 Poyoiyoi phát:', audioUrl);

    try {
        if (!player) {
            const a = new Audio(audioUrl);
            a.volume = 1.0;
            a.onerror = () => skipToNext('load error');
            a.play().catch(err => {
                if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') skipToNext(err.name);
            });
            return;
        }

        player.onerror = () => skipToNext('load error');
        player.pause();
        player.src = audioUrl;
        player.load();
        player.volume = 1.0;

        const playPromise = player.play();
        prefetchNextPoyoiyoiAudio();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                // AbortError: bị lần bấm mới ngắt ngang -> bình thường. NotAllowedError: trình duyệt chặn -> thử lại cũng vô ích.
                if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
                skipToNext(err.name);
            });
        }
    } catch (e) {
        console.warn('General audio error:', e);
        skipToNext('exception');
    }
}

// Web Audio Synthesizer Fallback
function playCuteWebAudioPop() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freqs = [
            [520, 880],
            [440, 780],
            [600, 1020],
            [350, 700]
        ];
        const chosen = freqs[Math.floor(Math.random() * freqs.length)];

        osc.type = 'sine';
        osc.frequency.setValueAtTime(chosen[0], ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(chosen[1], ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.29);
    } catch (e) {
        console.error(e);
    }
}


function spawnAudioNotes() {
    const notes = ['🎶', '🎵', '✨', '🍀', '💚'];
    const rect = poyoiyoiBtn.getBoundingClientRect();

    for (let i = 0; i < 3; i++) {
        const floater = document.createElement('div');
        floater.className = 'audio-note-floater';
        floater.innerText = notes[Math.floor(Math.random() * notes.length)];
        floater.style.left = `${rect.left + 35 + (i * 18)}px`;
        floater.style.top = `${rect.top + 10}px`;
        document.body.appendChild(floater);

        setTimeout(() => {
            if (floater.parentNode) floater.parentNode.removeChild(floater);
        }, 900);
    }
}

// ==========================================
// 🚀 INITIALIZE ON LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDailyCounter();
    initStockCounters();

    // Tiêu đề: tự co chữ cho vừa khung (chạy lại khi font tải xong hoặc đổi kích thước màn hình)
    fitTitleLines();
    window.addEventListener('load', fitTitleLines);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitleLines);
    let fitRaf = null;
    window.addEventListener('resize', () => {
        if (fitRaf) return;
        fitRaf = requestAnimationFrame(() => { fitRaf = null; fitTitleLines(); });
    });

    // Khi trình duyệt rảnh, tải sẵn file âm thanh đầu tiên của Poyoiyoi
    if ('requestIdleCallback' in window) requestIdleCallback(prefetchNextPoyoiyoiAudio, { timeout: 4000 });
    else setTimeout(prefetchNextPoyoiyoiAudio, 3000);

    // Tự động vẽ lại khung mây bất cứ khi nào thẻ thay đổi kích thước (Fix lỗi khung lúc ẩn lúc hiện)
    const scallopCard = document.getElementById('scallopCard');
    if (scallopCard) {
        const resizeObserver = new ResizeObserver(() => {
            scheduleScallopUpdate();
        });
        resizeObserver.observe(scallopCard);
    }
});

// Co từng dòng tiêu đề cho nằm gọn trong khung, không bao giờ bị tràn hai bên
function fitTitleLines() {
    const banner = document.querySelector('.title-banner');
    if (!banner) return;

    // Dòng to (SVG): tính cỡ chữ để chữ chạy gần hết chiều dài đường cong (áp dụng cho cả lớp viền và lớp chữ)
    const arcTexts = document.querySelectorAll('.title-arc-text');
    const arcPath = document.getElementById('titleArcPath');
    const arcTextPath = arcTexts.length ? arcTexts[0].querySelector('textPath') : null;
    if (arcPath && arcTextPath && arcTextPath.getComputedTextLength) {
        arcTexts.forEach(t => { t.style.fontSize = '30px'; });
        const len = arcTextPath.getComputedTextLength();
        if (len > 0) {
            const target = arcPath.getTotalLength() - 3;
            const size = Math.min(60, 30 * target / len).toFixed(2) + 'px';
            arcTexts.forEach(t => { t.style.fontSize = size; });
        }
    }

    const avail = banner.clientWidth - 16; // chừa chỗ cho viền vàng quanh chữ
    banner.querySelectorAll('.title-small').forEach(el => {
        el.style.fontSize = '';                 // về cỡ chữ gốc trong CSS
        const w = el.offsetWidth;               // offsetWidth không bị ảnh hưởng bởi hiệu ứng phóng to khi rê chuột
        if (w > avail && avail > 0) {
            const size = parseFloat(getComputedStyle(el).fontSize);
            el.style.fontSize = Math.floor(size * avail / w) + 'px';
        }
    });
}