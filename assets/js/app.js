const hashtagsData = {
    en: "#CORTIS #코르티스",
    kr: "#CORTIS #코르티스"
};

// Đường dẫn âm thanh nút Copy
const COPY_SOUND_URL = "assets/audio/wink.mp3";
const copySoundEl = new Audio(COPY_SOUND_URL);
copySoundEl.preload = 'auto';

function playCopySound() {
    try {
        copySoundEl.currentTime = 0;
        const p = copySoundEl.play();
        if (p !== undefined) p.catch(() => {});
    } catch (e) {}
}

const poyoiyoiAudios = [
    "assets/audio/1.mp4", "assets/audio/2.mp3", "assets/audio/3.mp3", "assets/audio/4.mp3", "assets/audio/5.mp3",
    "assets/audio/6.mp3", "assets/audio/7.mp3", "assets/audio/8.mp3", "assets/audio/9.mp3", "assets/audio/10.mp3",
    "assets/audio/11.mp3", "assets/audio/12.mp3", "assets/audio/13.mp3", "assets/audio/14.mp3", "assets/audio/15.mp3",
    "assets/audio/16.mp3", "assets/audio/17.mp3", "assets/audio/18.mp3", "assets/audio/19.mp3", "assets/audio/20.mp3",
    "assets/audio/21.mp3", "assets/audio/22.mp3", "assets/audio/23.mp3", "assets/audio/24.mp3", "assets/audio/25.mp3",
    "assets/audio/26.mp3", "assets/audio/27.mp3", "assets/audio/28.mp3", "assets/audio/29.mp3", "assets/audio/30.mp3",
    "assets/audio/31.mp3", "assets/audio/32.mp3", "assets/audio/33.mp3", "assets/audio/34.mp3", "assets/audio/35.mp3",
    "assets/audio/36.mp3", "assets/audio/37.mp3", "assets/audio/38.mp3", "assets/audio/39.mp3", "assets/audio/40.mp3",
    "assets/audio/41.mp3", "assets/audio/42.mp3", "assets/audio/43.mp3", "assets/audio/44.mp3", "assets/audio/45.mp3",
    "assets/audio/46.mp3", "assets/audio/47.mp3", "assets/audio/48.mp3", "assets/audio/49.mp3", "assets/audio/50.mp3",
    "assets/audio/51.mp3", "assets/audio/52.mp3", "assets/audio/53.mp3", "assets/audio/54.mp3", "assets/audio/55.mp3",
    "assets/audio/56.mp3", "assets/audio/57.mp3", "assets/audio/58.mp3", "assets/audio/59.mp3", "assets/audio/60.mp3",
    "assets/audio/61.mp3", "assets/audio/62.mp3", "assets/audio/63.mp3", "assets/audio/64.mp3", "assets/audio/65.mp3",
    "assets/audio/66.mp3", "assets/audio/67.mp3", "assets/audio/68.mp3", "assets/audio/69.mp3", "assets/audio/70.mp3"
];

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
let currentCaptionRef = null;
let currentCaptionLang = null;
let isCopying = false;
let isLoadingCaption = false; // Tối ưu: Khóa cờ ngôn ngữ khi đang tải

// Lưu trữ danh sách caption đã xáo trộn ngẫu nhiên
let shuffledCaptions = { en: [], kr: [] };

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

// ==========================================
// ⚙️ REAL-TIME CAPTION SYSTEM (FIREBASE)
// ==========================================

function setLanguage(lang) {
    if (currentLang === lang || isLoadingCaption) return; // Tối ưu: Bỏ qua nếu đang tải
    currentLang = lang;

    document.getElementById('btn-lang-en').classList.toggle('active', lang === 'en');
    document.getElementById('btn-lang-kr').classList.toggle('active', lang === 'kr');

    if (welcomePlaceholder) welcomePlaceholder.style.display = 'none';
    if (captionWorkspace) captionWorkspace.style.display = 'flex';

    if (lang === 'kr') {
        captionTextEl.classList.add('lang-kr');
    } else {
        captionTextEl.classList.remove('lang-kr');
    }

    pickRandomOtherCaption(false);
}

// Trích xuất ngẫu nhiên dữ liệu Caption trạng thái chưa sử dụng
async function fetchNextUniqueCaption(lang, excludeId = null) {
    const snapshot = await db.collection('captions')
        .where('lang', '==', lang)
        .where('isUsed', '==', false)
        .limit(3)
        .get();

    const docs = snapshot.docs.filter(d => d.id !== excludeId);
    if (docs.length === 0) return null;

    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    return { text: randomDoc.data().text, ref: randomDoc.ref, lang: lang };
}

// Giao dịch đánh dấu isUsed (State sync) khi người dùng hoàn thành copy
async function claimCaption(ref, lang) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            await db.runTransaction(async (transaction) => {
                const snap = await transaction.get(ref);
                if (!snap.exists || snap.data().isUsed) return;
                transaction.update(ref, { isUsed: true });
            });
            return;
        } catch (err) {
            console.warn('Sync state failed. Retrying:', err);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function checkStock(lang) {
    const snap = await db.collection('captions').where('lang', '==', lang).where('isUsed', '==', false).limit(1).get();
    return !snap.empty;
}

// Điều hướng hiển thị Caption và bắt lỗi truy vấn
async function pickRandomOtherCaption(animate = true, prefetch = null) {
    if (!currentLang) return;
    isLoadingCaption = true; // Tối ưu: Bắt đầu tải khóa nút
    currentCaptionRef = null;
    
    const requestLang = currentLang;
    const usePrefetch = prefetch && prefetch.lang === requestLang;

    // Giữ nguyên giao diện nếu có data prefetch
    if (!usePrefetch) {
        captionTextEl.classList.add('out-of-stock');
        captionTextEl.innerText = "⏳ Hệ thống đang bốc caption duy nhất...";
        captionHashtagsEl.innerText = "";
    }

    try {
        const picked = usePrefetch ? await prefetch.promise : await fetchNextUniqueCaption(requestLang);

        // Hủy render nếu user chuyển ngôn ngữ giữa chừng
        if (requestLang !== currentLang) {
            isLoadingCaption = false;
            return;
        }

        if (!picked) {
            const otherLang = currentLang === 'en' ? 'kr' : 'en';
            const otherLangName = otherLang === 'en' ? 'Tiếng Anh' : 'Tiếng Hàn';
            const currentLangName = currentLang === 'en' ? 'Tiếng Anh' : 'Tiếng Hàn';

            const otherStillHasStock = await checkStock(otherLang);
            captionTextEl.classList.add('out-of-stock');
            if (otherStillHasStock) {
                captionTextEl.innerText = `⚠️ Kho ${currentLangName} đã hết!\n👉 Bạn hãy chuyển qua lấy ${otherLangName} nhé!`;
            } else {
                captionTextEl.innerHTML = '🚨 Kho caption đã cạn kiệt!<br>📩 Vui lòng chờ hệ thống cập nhật thêm.';
            }

            currentCaptionText = "";
            captionHashtagsEl.innerText = "";
            if (copyBtn) copyBtn.style.display = 'none';
            isLoadingCaption = false;
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
        // Thông báo lỗi truy xuất/hết Quota tại Frontend
        captionTextEl.classList.add('out-of-stock');
        captionTextEl.innerHTML = `❌ Lỗi kết nối hoặc Firebase quá tải:<br><span style="font-size: 14px; color: #d32f2f;">${error.message}</span><br>Vui lòng F5 thử lại!`;
        currentCaptionText = "";
        captionHashtagsEl.innerText = "";
        if (copyBtn) copyBtn.style.display = 'none';
        console.error("Caption Load Error:", error);
    } finally {
        isCopying = false;
        isLoadingCaption = false; // Tối ưu: Mở khóa
    }
}

function animateCaptionSwitch() {
    captionBoxEl.classList.add('fading');
    setTimeout(() => {
        renderCaption();
        captionBoxEl.classList.remove('fading');
    }, 220);
}

function renderCaption() {
    if (!currentLang) return;
    captionTextEl.innerText = currentCaptionText;
    captionHashtagsEl.innerText = hashtagsData[currentLang] || "#CORTIS #코르티스";
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

// Tối ưu Throttle giới hạn tần suất vẽ lại thẻ mây trên thiết bị di động
let scallopResizeTimer;
function scheduleScallopUpdate() {
    if (!scallopResizeTimer) {
        scallopResizeTimer = setTimeout(() => {
            scallopResizeTimer = null;
            requestAnimationFrame(updateScallopFrame);
        }, 100); 
    }
}
window.addEventListener('resize', scheduleScallopUpdate);

// ==========================================
// 3. COPY BUTTON & BURST PARTICLES
// ==========================================
// Ghi nội dung text vào Clipboard
async function copyTextToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('Clipboard API error. Falling back:', err);
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
    if (!currentLang || !currentCaptionRef || isCopying) return;
    isCopying = true;

    const ref = currentCaptionRef;
    const lang = currentCaptionLang;
    const fullTextToCopy = `${captionTextEl.innerText}\n\n${captionHashtagsEl.innerText}`;

    const copied = await copyTextToClipboard(fullTextToCopy);
    if (!copied) {
        showToast('Chưa copy được, bạn bấm lại nha 🥲');
        isCopying = false;
        return;
    }

    playCopySound();

    currentCaptionRef = null;
    const claimPromise = claimCaption(ref, lang);

    // Tải trước (prefetch) caption kế tiếp để giảm delay UI
    const nextPromise = fetchNextUniqueCaption(lang, ref.id);
    nextPromise.catch(() => {});

    eyesOpenSvg.style.display = 'none';
    eyesWinkSvg.style.display = 'block';
    copyBtn.style.transform = 'scale(0.96)';

    setTimeout(() => {
        eyesOpenSvg.style.display = 'block';
        eyesWinkSvg.style.display = 'none';
        copyBtn.style.transform = '';
    }, 1000);

    burstAnimalEmojis();
    showToast('Đã copy! Vui lòng qua X ngay!! Trạm có giới hạn tài nguyên, xin đừng copy rồi bỏ đó (gõ cửa từng nhà đấy)!');

    const streakData = incrementDailyCounter();
    if (streakData.isRecovery) {
        setTimeout(() => {
            document.getElementById('recoverySuccessModal').classList.add('show');
            try {
                const audio = document.getElementById('milestoneAudioPlayer');
                audio.currentTime = 0; audio.play().catch(()=>{});
            } catch (err) {}
        }, 800);
    } else if (streakData.isMilestone) {
        setTimeout(() => {
            showMilestoneModal(streakData.streak);
        }, 800);
    }

    setTimeout(async () => {
        await claimPromise;
        pickRandomOtherCaption(true, { lang: lang, promise: nextPromise });
    }, 1000);
}

// Hiệu ứng hạt Emojis khi copy
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
    }, 4000);
}

// ==========================================
// 4. ADVANCED COUNTER, STREAK & RECOVERY SYSTEM
// ==========================================
const DATE_KEY = 'cloveris_br_date_record';
const DAILY_COUNT_KEY = 'cloveris_br_count_record';
const TOTAL_COUNT_KEY = 'cloveris_br_total_count';
const STREAK_KEY = 'cloveris_br_streak';
const LAST_STREAK_DATE_KEY = 'cloveris_br_last_streak_date';
const FROZEN_STREAK_KEY = 'cloveris_frozen_streak';
const MISSED_DAYS_KEY = 'cloveris_missed_days';
const FROZEN_DATE_KEY = 'cloveris_frozen_date';

function getSafeInt(key) {
    const val = parseInt(localStorage.getItem(key) || '0', 10);
    return Number.isFinite(val) && val > 0 ? val : 0;
}

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDiffDays(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return 0;
    const parts1 = dateStr1.split('-').map(Number);
    const parts2 = dateStr2.split('-').map(Number);
    if (parts1.length !== 3 || parts2.length !== 3) return 0;
    const utc1 = Date.UTC(parts1[0], parts1[1] - 1, parts1[2]);
    const utc2 = Date.UTC(parts2[0], parts2[1] - 1, parts2[2]);
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function clearFrozenState() {
    localStorage.removeItem(FROZEN_STREAK_KEY);
    localStorage.removeItem(MISSED_DAYS_KEY);
    localStorage.removeItem(FROZEN_DATE_KEY);
}

function updateRecoveryBanner() {
    const bannerEl = document.getElementById('recoveryStatusBanner');
    if (!bannerEl) return;

    const today = getTodayString();
    const frozenStreak = getSafeInt(FROZEN_STREAK_KEY);
    const missedDays = getSafeInt(MISSED_DAYS_KEY);
    const frozenDate = localStorage.getItem(FROZEN_DATE_KEY);
    const dailyCount = (localStorage.getItem(DATE_KEY) === today) ? getSafeInt(DAILY_COUNT_KEY) : 0;

    if (frozenStreak > 0 && (!frozenDate || frozenDate === today)) {
        const targetCaps = (missedDays * 2) + 1;
        const remaining = Math.max(0, targetCaps - dailyCount);

        const streakSpan = document.getElementById('bannerFrozenStreak');
        const remainSpan = document.getElementById('bannerRemainingCaps');
        if (streakSpan) streakSpan.innerText = frozenStreak;
        if (remainSpan) remainSpan.innerText = remaining;

        bannerEl.style.display = 'block';
    } else {
        bannerEl.style.display = 'none';
    }
}

function initDailyCounter() {
    const today = getTodayString();
    const storedDate = localStorage.getItem(DATE_KEY);

    let dailyCount = getSafeInt(DAILY_COUNT_KEY);
    let totalCount = getSafeInt(TOTAL_COUNT_KEY);
    let streak = getSafeInt(STREAK_KEY);
    let frozenStreak = getSafeInt(FROZEN_STREAK_KEY);
    let frozenDate = localStorage.getItem(FROZEN_DATE_KEY);

    // 1. Nếu có chuỗi đóng băng từ ngày hôm trước mà sang ngày mới vẫn chưa bù xong -> Hủy quyền bù
    if (frozenStreak > 0 && frozenDate && frozenDate !== today) {
        clearFrozenState();
        frozenStreak = 0;
        frozenDate = null;
    }

    // 2. Xử lý khi bước sang ngày mới so với lần copy gần nhất
    if (storedDate && storedDate !== today) {
        const diff = getDiffDays(storedDate, today);

        // Chỉ đóng băng nếu đứt chuỗi > 1 ngày và chưa đóng băng trong hôm nay
        if (diff > 1 && streak > 0 && frozenStreak === 0) {
            frozenStreak = streak;
            const missedDays = diff - 1;
            localStorage.setItem(FROZEN_STREAK_KEY, frozenStreak.toString());
            localStorage.setItem(MISSED_DAYS_KEY, missedDays.toString());
            localStorage.setItem(FROZEN_DATE_KEY, today);

            streak = 0;
            localStorage.setItem(STREAK_KEY, '0');
        }

        dailyCount = 0;
        localStorage.setItem(DAILY_COUNT_KEY, '0');
    }

    // 3. Tự vá lỗi dây chuyền: đã copy hôm nay và không trong chế độ bù nhưng chuỗi vẫn bằng 0
    if (frozenStreak === 0 && streak === 0 && storedDate === today && dailyCount > 0) {
        streak = 1;
        localStorage.setItem(STREAK_KEY, '1');
        localStorage.setItem(LAST_STREAK_DATE_KEY, today);
    }

    copyCounterEl.innerText = dailyCount;
    document.getElementById('totalCount').innerText = totalCount;
    document.getElementById('streakCount').innerText = streak;

    updateRecoveryBanner();

    document.getElementById('rulesModal').classList.add('show');
}

function incrementDailyCounter() {
    const today = getTodayString();
    const storedDate = localStorage.getItem(DATE_KEY);
    const lastStreakDate = localStorage.getItem(LAST_STREAK_DATE_KEY);

    let dailyCount = getSafeInt(DAILY_COUNT_KEY);
    let totalCount = getSafeInt(TOTAL_COUNT_KEY);
    let streak = getSafeInt(STREAK_KEY);
    let frozenStreak = getSafeInt(FROZEN_STREAK_KEY);
    let missedDays = getSafeInt(MISSED_DAYS_KEY);

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
    let justRecovered = false;

    if (frozenStreak > 0) {
        // Đang trong ngày thử thách bù chuỗi
        const requiredCaps = (missedDays * 2) + 1;
        if (dailyCount >= requiredCaps) {
            streak = frozenStreak + 1;
            localStorage.setItem(STREAK_KEY, streak.toString());
            localStorage.setItem(LAST_STREAK_DATE_KEY, today);
            document.getElementById('streakCount').innerText = streak;

            clearFrozenState();
            frozenStreak = 0;
            missedDays = 0;

            justRecovered = true;
            document.getElementById('successTargetText').innerText = requiredCaps;
            document.getElementById('successStreakText').innerText = streak;
        }
    } else {
        // Luồng tính chuỗi bình thường
        if (lastStreakDate !== today || streak === 0) {
            if (streak > 0 && lastStreakDate && getDiffDays(lastStreakDate, today) === 1) {
                streak++;
            } else {
                streak = 1;
            }

            localStorage.setItem(STREAK_KEY, streak.toString());
            localStorage.setItem(LAST_STREAK_DATE_KEY, today);
            document.getElementById('streakCount').innerText = streak;

            if (streak > 0 && streak % 5 === 0) justHitMilestone = true;
        }
    }

    updateRecoveryBanner();

    return { streak: streak, isMilestone: justHitMilestone, isRecovery: justRecovered };
}

// ---------------------------------------------
// ĐIỀU KHIỂN CÁC BẢNG THÔNG BÁO (MODALS)
// ---------------------------------------------
function closeRulesModal() {
    document.getElementById('rulesModal').classList.remove('show');
    checkAndShowRecoveryPrompt();
}

function checkAndShowRecoveryPrompt() {
    const today = getTodayString();
    const frozenStreak = getSafeInt(FROZEN_STREAK_KEY);
    const missedDays = getSafeInt(MISSED_DAYS_KEY);
    const frozenDate = localStorage.getItem(FROZEN_DATE_KEY);
    const dailyCount = (localStorage.getItem(DATE_KEY) === today) ? getSafeInt(DAILY_COUNT_KEY) : 0;

    if (frozenStreak > 0 && (!frozenDate || frozenDate === today)) {
        const targetCaps = (missedDays * 2) + 1;

        // Chỉ bật popup 1 lần trong phiên; nếu F5 lại thì chỉ nhắc nhẹ bằng Toast
        if (!sessionStorage.getItem('recovery_prompted')) {
            document.getElementById('missedDaysText').innerText = missedDays;
            document.getElementById('frozenStreakText').innerText = frozenStreak;
            document.getElementById('targetCapsText').innerText = targetCaps;

            document.getElementById('recoveryPromptModal').classList.add('show');
            sessionStorage.setItem('recovery_prompted', 'true');
        } else if (dailyCount < targetCaps) {
            showToast(`🍀 Bạn đang bù chuỗi: đã xong ${dailyCount}/${targetCaps} caption hôm nay!`);
        }
    }
}

function closeRecoveryPrompt() {
    document.getElementById('recoveryPromptModal').classList.remove('show');

    setTimeout(() => {
        alert("🍀 LỜI NHẮN TỪ TRẠM:\n\nĐừng vì nôn nóng khôi phục chuỗi mà chỉ bấm Copy cho đủ số lượng rồi bỏ đó nha 🥺\n\nCác COER hãy nhớ dán qua X và đăng bài đàng hoàng cách nhau ít nhất 10 phút để giúp CORTIS tăng Brand Reputation thật sự nhé! Cố lên! 💚");
    }, 400);
}

function declineRecovery() {
    const today = getTodayString();
    const dailyCount = (localStorage.getItem(DATE_KEY) === today) ? getSafeInt(DAILY_COUNT_KEY) : 0;

    clearFrozenState();

    updateRecoveryBanner();

    // Nếu hôm nay đã copy ít nhất 1 cap rồi thì tính ngay chuỗi mới là 1, không để kẹt ở 0
    if (dailyCount > 0) {
        localStorage.setItem(STREAK_KEY, '1');
        localStorage.setItem(LAST_STREAK_DATE_KEY, today);
        document.getElementById('streakCount').innerText = '1';
    } else {
        localStorage.setItem(STREAK_KEY, '0');
        localStorage.removeItem(LAST_STREAK_DATE_KEY);
        document.getElementById('streakCount').innerText = '0';
    }

    document.getElementById('recoveryPromptModal').classList.remove('show');
    showToast("Đã hủy khôi phục. Cùng cày lại từ đầu nhé!");
}

function closeRecoverySuccess() {
    document.getElementById('recoverySuccessModal').classList.remove('show');
}

const streakAudioFiles = [
    "assets/audio/streak_1.mp3",
    "assets/audio/streak_2.mp3",
    "assets/audio/streak_3.mp3",
    "assets/audio/streak_4.mp3",
    "assets/audio/streak_5.mp3"
];
const STREAK_INDEX_KEY = 'cloveris_streak_audio_index';

let currentModalStreak = 0;
let mascotTapCount = 0;
let mascotTapStep = 0;
let isMilestoneAudioPlaying = false;

// Phát 1 file âm thanh và khóa đếm tap cho tới khi phát xong
function playSingleMilestoneAudio(audioUrl) {
    const audio = document.getElementById('milestoneAudioPlayer');
    if (!audio || !audioUrl) return;

    try {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = audioUrl;
        audio.load();
        audio.currentTime = 0;

        isMilestoneAudioPlaying = true;

        audio.onended = () => {
            isMilestoneAudioPlaying = false;
        };

        audio.onerror = () => {
            isMilestoneAudioPlaying = false;
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((err) => {
                isMilestoneAudioPlaying = false;
                if (err.name !== 'AbortError') {
                    console.warn("Không thể phát âm thanh:", err);
                }
            });
        }
    } catch (err) {
        isMilestoneAudioPlaying = false;
        console.error("Lỗi phát audio:", err);
    }
}

// Mở bảng thông báo: luôn phát ngay sound của cột mốc gần nhất đã vượt qua
function showMilestoneModal(streakNum) {
    currentModalStreak = streakNum;
    mascotTapCount = 0;
    mascotTapStep = 0;

    const modal = document.getElementById('milestoneModal');
    const titleEl = document.getElementById('milestoneTitle');
    const descEl = document.getElementById('milestoneDesc');
    const subDescEl = document.getElementById('milestoneSubDesc');
    const hintEl = document.getElementById('milestoneHint');

    const isSpecialMilestone = (streakNum > 0 && streakNum % 5 === 0);

    if (isSpecialMilestone) {
        // Ngày đặc biệt (5, 10, 15...)
        if (titleEl) titleEl.innerText = "Tuyệt vời quá!";
        if (descEl) {
            descEl.innerHTML = `COER đã duy trì được chuỗi <br><span id="milestoneNumber" class="milestone-num">${streakNum}</span>`;
        }
        if (subDescEl) {
            subDescEl.innerHTML = `ngày liên tiếp<br>cùng TRẠM BRB CxC! 🍀`;
        }
    } else {
        // Ngày thường từ 6 trở đi (6-9, 11-14, 16-19...)
        if (titleEl) titleEl.innerText = "Chúc mừng COER! 🌟";
        if (descEl) {
            descEl.innerHTML = `Cảm ơn bạn đã nỗ lực suốt <br><span id="milestoneNumber" class="milestone-num">${streakNum}</span>`;
        }
        if (subDescEl) {
            subDescEl.innerHTML = `ngày qua cùng TRẠM BRB CxC! 💚`;
        }
    }

    if (hintEl) {
        hintEl.innerText = "Nhấp vào poyoiyoi 5 lần để nghe lại những sound của cột mốc qua";
    }

    // Tự động phát sound của cột mốc gần nhất (VD: chuỗi 16 -> mốc 15 -> streak_3.mp3)
    const latestMilestoneIndex = Math.floor(streakNum / 5) - 1;
    if (latestMilestoneIndex >= 0 && streakAudioFiles.length > 0) {
        const audioIndex = latestMilestoneIndex % streakAudioFiles.length;
        playSingleMilestoneAudio(streakAudioFiles[audioIndex]);
    }

    modal.classList.add('show');
}

// Chỉ tính lượt nhấp sau khi sound hiện tại đã phát xong; đủ 5 lần sẽ mở sound từ mốc 5
function handleMilestoneMascotTap() {
    const mascotEl = document.getElementById('milestoneMascotBtn');
    if (mascotEl) {
        mascotEl.classList.remove('mascot-pop');
        void mascotEl.offsetWidth;
        mascotEl.classList.add('mascot-pop');
    }

    // Đang phát sound thì chưa tính lượt click
    if (isMilestoneAudioPlaying) return;

    const passedCount = Math.floor(currentModalStreak / 5);
    if (passedCount <= 0) return;

    mascotTapCount++;
    if (mascotTapCount < 5) return;

    // Đủ 5 lần nhấp sau khi hết sound -> đặt lại đếm và phát lần lượt từ mốc 5 (streak_1)
    mascotTapCount = 0;

    const audioIndex = (mascotTapStep % passedCount) % streakAudioFiles.length;
    playSingleMilestoneAudio(streakAudioFiles[audioIndex]);

    mascotTapStep++;
}

function closeMilestoneModal() {
    document.getElementById('milestoneModal').classList.remove('show');
    mascotTapCount = 0;
    mascotTapStep = 0;
    isMilestoneAudioPlaying = false;
    try {
        const audio = document.getElementById('milestoneAudioPlayer');
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.currentTime = 0;
    } catch (err) {}
}

// ==========================================
// 5. POYOIYOI MASCOT (AUDIO & QUOTES)
// ==========================================
let shuffledAudios = [];

function handlePoyoiyoiClick() {
    poyoiyoiBtn.classList.remove('jiggle');
    void poyoiyoiBtn.offsetWidth;
    poyoiyoiBtn.classList.add('jiggle');

    const randomQuote = poyoiyoiQuotes[Math.floor(Math.random() * poyoiyoiQuotes.length)];
    speechTextEl.innerText = randomQuote;

    spawnAudioNotes();
    playPoyoiyoiSound();
}

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

function prefetchNextPoyoiyoiAudio() {
    try {
        if (!poyoiyoiAudios || poyoiyoiAudios.length === 0) return;
        if (shuffledAudios.length === 0) shuffledAudios = shuffleArray([...poyoiyoiAudios]);
        const next = shuffledAudios[shuffledAudios.length - 1];
        poyoiyoiPrefetchEl = new Audio();
        poyoiyoiPrefetchEl.preload = 'auto';
        poyoiyoiPrefetchEl.src = next;
    } catch (e) {}
}

let poyoiyoiPlayToken = 0;

function playPoyoiyoiSound(retry = 0) {
    if (!poyoiyoiAudios || poyoiyoiAudios.length === 0) return;

    if (shuffledAudios.length === 0) {
        shuffledAudios = shuffleArray([...poyoiyoiAudios]);
    }

    const audioUrl = shuffledAudios.pop();
    const player = document.getElementById('poyoiyoiAudioPlayer');
    const myToken = ++poyoiyoiPlayToken;

    const skipToNext = (reason) => {
        if (myToken !== poyoiyoiPlayToken) return;
        console.warn(`[Audio] Fetch failed for "${audioUrl}" (${reason}) - Advancing to next track`);
        if (retry < 5) playPoyoiyoiSound(retry + 1);
    };

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
                if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
                skipToNext(err.name);
            });
        }
    } catch (e) {
        console.warn('Playback exception:', e);
        skipToNext('exception');
    }
}

function playCuteWebAudioPop() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freqs = [[520, 880], [440, 780], [600, 1020], [350, 700]];
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

    fitTitleLines();
    window.addEventListener('load', fitTitleLines);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitleLines);
    
    let fitRaf = null;
    window.addEventListener('resize', () => {
        if (fitRaf) return;
        fitRaf = requestAnimationFrame(() => { fitRaf = null; fitTitleLines(); });
    });

    if ('requestIdleCallback' in window) {
        requestIdleCallback(prefetchNextPoyoiyoiAudio, { timeout: 4000 });
    } else {
        setTimeout(prefetchNextPoyoiyoiAudio, 3000);
    }

    const scallopCard = document.getElementById('scallopCard');
    if (scallopCard) {
        const resizeObserver = new ResizeObserver(() => {
            scheduleScallopUpdate();
        });
        resizeObserver.observe(scallopCard);
    }
});

function fitTitleLines() {
    const banner = document.querySelector('.title-banner');
    if (!banner) return;

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

    const avail = banner.clientWidth - 16;
    banner.querySelectorAll('.title-small').forEach(el => {
        el.style.fontSize = '';
        const w = el.offsetWidth;
        if (w > avail && avail > 0) {
            const size = parseFloat(getComputedStyle(el).fontSize);
            el.style.fontSize = Math.floor(size * avail / w) + 'px';
        }
    });
}

// ==========================================
// 🍀 MỞ BẢNG KỶ NIỆM KHI TAP 5 LẦN VÀO TIÊU ĐỀ
// ==========================================
let titleClickCount = 0;
let titleClickTimer = null;

const titleBannerEl = document.querySelector('.title-banner');
if (titleBannerEl) {
    titleBannerEl.addEventListener('click', () => {
        titleClickCount++;
        
        if (titleClickTimer) clearTimeout(titleClickTimer);
        titleClickTimer = setTimeout(() => {
            titleClickCount = 0;
        }, 1500);

        if (titleClickCount === 5) {
            titleClickCount = 0; 
            
            const currentStreak = parseInt(localStorage.getItem('cloveris_br_streak') || '0', 10);
            
            if (currentStreak < 5) {
                showToast("🍀 Bạn cần đạt mốc tối thiểu 5 ngày để mở khóa sound kỷ niệm nhé!");
                return;
            }

            showMilestoneModal(currentStreak);
        }
    });
}