document.addEventListener('DOMContentLoaded', () => {
    /* --- CONFIGURATION --- */
    const TARGET_DATE = new Date('2026-02-14T20:00:00').getTime();
    const PASSWORD = "1601";
    const SECRET_PHRASE = ["Un", "commentaire", "sur", "TikTok", "et", "tout", "a", "changé."];
    const STEP_LABELS = [
        "Intro",
        "Code secret",
        "Question Valentine",
        "Analyse des sentiments",
        "",
        "Quiz",
        "BD",
        "Message secret",
        "Audio",
        "Ticket",
        "Lettre",
        "Final"
    ];
    // --- STATE MANAGEMENT ---
    let currentStep = parseInt(localStorage.getItem('vday_step_v3')) || 0; // v3 versioning to force reset logic if needed by user manually clearing
    let isMusicPlaying = false;
    let audioUnlocked = false;

    // --- AUDIO MANAGER (SFX) ---
    const AudioManager = (() => {
        const base = 'assets/sfx/';
        const files = {
            click_soft: 'click.mp3',
            success_chime: 'success.mp3',
            error_soft: 'error.mp3',
            boop: 'boop.mp3',
            ding: 'ding.mp3',
            bloop: 'bloop.mp3',
            sparkle: 'sparkle.mp3',
            unlock: 'unlock.mp3',
            whoosh: 'whoosh.mp3',
            scratch_loop: 'scratch.mp3',
            reveal: 'reveal.mp3'
        };
        const cooldowns = {};
        const sounds = {};
        const volume = 0.35;
        const mutedKey = 'vday_sfx_muted';
        let muted = localStorage.getItem(mutedKey) === '1';

        Object.keys(files).forEach((k) => {
            const a = new Audio(base + files[k]);
            a.preload = 'auto';
            a.volume = volume;
            sounds[k] = a;
        });

        function setMuted(v) {
            muted = !!v;
            localStorage.setItem(mutedKey, muted ? '1' : '0');
        }
        function isMuted() { return muted; }
        function play(name, opts = {}) {
            if (!audioUnlocked) audioUnlocked = true;
            if (muted) return;
            const now = Date.now();
            const cd = opts.cooldown ?? 120;
            if (cooldowns[name] && now - cooldowns[name] < cd) return;
            cooldowns[name] = now;
            const snd = sounds[name];
            if (!snd) return;
            try {
                snd.pause();
                snd.currentTime = 0;
                snd.volume = opts.volume ?? volume;
                snd.playbackRate = opts.rate ?? 1;
                snd.play().catch(() => {});
            } catch (_) {}
        }
        function loop(name, on) {
            const snd = sounds[name];
            if (!snd) return;
            if (!audioUnlocked || muted) return;
            snd.loop = !!on;
            snd.volume = 0.2;
            if (on) snd.play().catch(() => {});
            else {
                snd.pause();
                snd.currentTime = 0;
            }
        }
        return { play, loop, setMuted, isMuted };
    })();

    function initAudioUnlock() {
        if (audioUnlocked) return;
        audioUnlocked = true;
    }
    // --- UTILS ---
    function initMagicCursor() {
        // Create the main cursor element
        const cursorValues = ['✨', '❤️', '🌟'];
        const cursor = document.createElement('div');
        cursor.id = 'magic-cursor';
        cursor.innerText = '✨'; // Default
        document.body.appendChild(cursor);
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            // Spawn trail particle (throttle slightly for performance if needed, but per request every move)
            if (Math.random() < 0.3) { // 30% chance per event to avoid too many
                createParticle(e.clientX, e.clientY);
            }
        });
        // Click burst
        document.addEventListener('click', (e) => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => cursor.style.transform = 'translate(-50%, -50%) scale(1)', 100);
            for (let i = 0; i < 8; i++) {
                createParticle(e.clientX, e.clientY, true);
            }
        });
        function createParticle(x, y, isBurst = false) {
            const particle = document.createElement('div');
            particle.classList.add('cursor-particle');
            document.body.appendChild(particle);
            // Random properties
            const size = Math.random() * 8 + 4; // 4px to 12px
            const colors = ['#FFD700', '#FF69B4', '#FFFFFF', '#87CEFA']; // Gold, Pink, White, LightBlue
            const color = colors[Math.floor(Math.random() * colors.length)];
            // Set styles
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.backgroundColor = color;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            // Random movement destination
            const destX = x + (Math.random() - 0.5) * (isBurst ? 100 : 30);
            const destY = y + (Math.random() - 0.5) * (isBurst ? 100 : 30);
            // Animate manually for more control or use Web Animations API
            const animation = particle.animate([
                { transform: `translate(-50%, -50%) scale(1)`, opacity: 1 },
                { transform: `translate(calc(-50% + ${destX - x}px), calc(-50% + ${destY - y}px)) scale(0)`, opacity: 0 }
            ], {
                duration: 500 + Math.random() * 300,
                easing: 'cubic-bezier(0, .9, .57, 1)',
                fill: 'forwards'
            });
            animation.onfinish = () => particle.remove();
        }
    }
    // --- INIT ---
    initParticles();
    initMagicCursor(); // Start Custom Cursor
    // Check if Intro has already been seen this session (optional, but requested for every load here)
    const intro = document.getElementById('cinematic-intro');
    if (intro) {
        // Force Step 0 initially under the overlay
        // showStep(0); 
        // Sequence:
        // 0s-1s: Black (CSS default)
        // 1s-5s: Animation (CSS)
        // 5s: Fade Out
        setTimeout(() => {
            intro.style.opacity = '0';
            intro.style.transform = 'scale(1.1)';
            setTimeout(() => {
                intro.style.display = 'none';
                showStep(0); // Reveal Lock Screen
            }, 1000); // Wait for transition
        }, 5000);
    } else {
        showStep(currentStep);
    }
    // --- NAVIGATION ENGINE ---
    function showStep(stepNumber) {
        currentStep = stepNumber;
        localStorage.setItem('vday_step_v3', stepNumber);
        const currentActive = document.querySelector('.step.active');
        const targetStepId = `step-${stepNumber}`;
        // If trying to show the step that is already active (e.g. on reload)
        if (currentActive && currentActive.id === targetStepId) {
            currentActive.style.opacity = '1';
            currentActive.style.transform = 'translateY(0)';
            currentActive.classList.remove('hidden');
            currentActive.classList.add('active');
            // Re-trigger specific init logic for the step if needed (like Typewriter or scratch card)
            if (stepNumber === 2) startTypewriter();
            if (stepNumber === 8) initScratchCard();
        } else if (currentActive) {
            // Transition out
            currentActive.style.opacity = '0';
            currentActive.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                currentActive.classList.remove('active');
                currentActive.classList.add('hidden');
                revealNewStep(stepNumber);
            }, 500);
        } else {
            // First load
            revealNewStep(stepNumber);
        }
        // Global UI updates based on step
        updateProgress(stepNumber);
        const uxBar = document.querySelector('.ux-bar');
        if (uxBar) {
            if (stepNumber >= 4) uxBar.classList.add('show');
            else uxBar.classList.remove('show');
        }
        if (stepNumber > 0) document.getElementById('music-player').classList.remove('hidden');
        if (currentActive && currentActive.id !== targetStepId) {
            AudioManager.play('whoosh', { cooldown: 150, volume: 0.25 });
        }
        switch (stepNumber) {
            case 0: initLogin(); break;
            case 1: initSmartNoButton(); break;
            case 2: startTypewriter(); break;
            case 3: startTimer(); break;
            case 4: initQuiz(); break;
            case 5: initComicReader(); break;
            case 6: initPuzzle(); break;
            case 7: initAudio(); break;
            case 9: initEnvelope(); break;
            case 10: initFinalCelebration(); break;
        }
    }
    function revealNewStep(num) {
        const step = document.getElementById(`step-${num}`);
        if (step) {
            step.classList.remove('hidden');
            void step.offsetWidth; // Force Reflow
            step.classList.add('active');
            // Initialize Step Logic AFTER it is visible
            if (num === 2) startTypewriter();
            if (num === 8) setTimeout(initScratchCard, 100); // 100ms delay to ensure layout is done
        }
    }
    // --- STEP 0: LOGIN (Updated with Heart Lock) ---
    function initLogin() {
        const input = document.getElementById('password-input');
        const error = document.getElementById('login-error');
        const lockIcon = document.getElementById('lock-icon');
        const lockContainer = document.querySelector('.lock-container');
        const validate = () => {
            if (input.value === PASSWORD) {
                initAudioUnlock();
                // Unlock Animation
                lockIcon.className = "fa-solid fa-lock-open";
                lockContainer.classList.add('unlocked');
                input.style.borderColor = "#2ecc71";
                AudioManager.play('success_chime');
                setTimeout(() => {
                    playMusic(); // Auto start music
                    showStep(1);
                }, 1000);
            } else if (input.value.length === 4) {
                initAudioUnlock();
                // Error Animation
                error.innerText = "Non, ce n'est pas ça...";
                AudioManager.play('error_soft');
                input.parentElement.classList.add('shake');
                input.value = '';
                setTimeout(() => {
                    input.parentElement.classList.remove('shake');
                    error.innerText = "";
                }, 800);
            }
        };
        // Auto-submit on 4 chars
        input.addEventListener('input', () => {
            if (input.value.length === 4) validate();
        });
    }
    // --- STEP 1: SMART 'NO' BUTTON (Advanced Runaway) ---
    function initSmartNoButton() {
        const btnNo = document.getElementById('btn-no');
        const btnYes = document.getElementById('btn-yes');
        const zone = document.getElementById('no-zone');
        const feedback = document.getElementById('no-feedback');
        const hint = document.getElementById('no-hint');
        if (!btnNo || !btnYes || !zone) return;
        // Force absolute positioning for dodge behavior
        zone.classList.add('no-active');
        btnNo.style.position = 'absolute';
        btnNo.style.left = '0px';
        btnNo.style.top = '0px';
        let attempts = 0;
        let curX = 0;
        let curY = 0;
        let curScale = 1;
        let curRot = 0;
        let lastMoveTs = 0;
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const feedbackMessages = [
            "Vraiment ? 😏",
            "Essaie encore…",
            "Nope 😌",
            "Tu es sûre ?",
            "Je fais semblant de ne pas avoir vu.",
            "On sait tous les deux que tu vas dire oui."
        ];
        const buttonTexts = [
            "Non",
            "Non 😇",
            "Euh… non",
            "Nope",
            "Impossible",
            "J’essaie",
            "Toujours non ?"
        ];
        function clamp(val, min, max) {
            return Math.min(max, Math.max(min, val));
        }
        function zoneRect() {
            return zone.getBoundingClientRect();
        }
        function initPosition() {
            const z = zone.getBoundingClientRect();
            const b = btnNo.getBoundingClientRect();
            // Keep current visual position from flex, then switch to absolute translate
            curX = clamp(b.left - z.left, 0, Math.max(0, z.width - b.width));
            curY = clamp(b.top - z.top, 0, Math.max(0, z.height - b.height));
            btnNo.style.left = '0px';
            btnNo.style.top = '0px';
            btnNo.style.transform = `translate(${curX}px, ${curY}px) scale(${curScale}) rotate(${curRot}deg)`;
        }
        function moveRandom() {
            const z = zoneRect();
            const b = btnNo.getBoundingClientRect();
            const maxX = Math.max(0, z.width - b.width);
            const maxY = Math.max(0, z.height - b.height);
            const x = Math.random() * maxX;
            const y = Math.random() * maxY;
            curX = clamp(x, 0, maxX);
            curY = clamp(y, 0, maxY);
            btnNo.style.transform = `translate(${curX}px, ${curY}px) scale(${curScale}) rotate(${curRot}deg)`;
        }
        function updateEffects() {
            if (attempts >= 7) {
                curScale = 0.75;
            } else if (attempts >= 5) {
                curScale = 0.9;
            } else if (attempts >= 3) {
                curScale = 0.95;
            } else {
                curScale = 1;
            }
            if (attempts >= 5) {
                curRot = (Math.random() > 0.5 ? 1 : -1) * (prefersReduced ? 2 : 6);
                btnNo.style.boxShadow = "0 8px 20px rgba(255, 154, 158, 0.35)";
            } else {
                curRot = 0;
                btnNo.style.boxShadow = "";
            }
            if (hint && attempts >= 7) hint.classList.add('show');
        }
        function taunt() {
            if (feedback) feedback.textContent = feedbackMessages[attempts % feedbackMessages.length];
            btnNo.textContent = buttonTexts[attempts % buttonTexts.length];
        }
        function handleAttempt(e) {
            if (currentStep !== 1) return;
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            attempts += 1;
            taunt();
            updateEffects();
            moveRandom();
            AudioManager.play('boop', { cooldown: 140, volume: 0.22 });
        }
        function isNearButton(clientX, clientY) {
            const b = btnNo.getBoundingClientRect();
            const cx = b.left + b.width / 2;
            const cy = b.top + b.height / 2;
            const dx = clientX - cx;
            const dy = clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < (prefersReduced ? 120 : 80);
        }
        function withinZone(clientX, clientY) {
            const z = zoneRect();
            return clientX >= z.left && clientX <= z.right && clientY >= z.top && clientY <= z.bottom;
        }
        function onPointerMove(e) {
            if (currentStep !== 1) return;
            const now = Date.now();
            const cooldown = prefersReduced ? 400 : 180;
            if (now - lastMoveTs < cooldown) return;
            if (!withinZone(e.clientX, e.clientY)) return;
            if (isNearButton(e.clientX, e.clientY)) {
                lastMoveTs = now;
                handleAttempt(e);
            }
        }
        document.addEventListener('pointermove', onPointerMove);
        zone.addEventListener('pointerdown', (e) => {
            if (currentStep !== 1) return;
            if (isNearButton(e.clientX, e.clientY)) {
                handleAttempt(e);
            }
        }, { passive: false });
        window.addEventListener('resize', initPosition);
        btnNo.addEventListener('pointerdown', handleAttempt, { passive: false });
        btnNo.addEventListener('pointerenter', handleAttempt, { passive: false });
        btnNo.addEventListener('mouseenter', handleAttempt, { passive: false });
        btnNo.addEventListener('touchstart', handleAttempt, { passive: false });
        btnNo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        btnYes.onclick = () => {
            celebrate();
            showStep(2);
        }
        requestAnimationFrame(initPosition);
    }
    // --- STEP 2: TYPEWRITER (Bug Fix & New Style) ---
    let introTypingTimeout = null;
    let isIntroTyping = false;
    let matchAnimFrame = null;
    function animateMatchProgress(durationMs = 1400, onDone) {
        const wrap = document.getElementById('match-progress');
        const fill = document.getElementById('match-fill');
        const value = document.getElementById('match-value');
        if (!wrap || !fill || !value) return;
        if (matchAnimFrame) cancelAnimationFrame(matchAnimFrame);
        wrap.classList.add('show');
        const start = performance.now();
        const animate = (now) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const pct = Math.round(eased * 100);
            fill.style.width = `${pct}%`;
            value.textContent = String(pct);
            if (t < 1) {
                matchAnimFrame = requestAnimationFrame(animate);
            } else if (onDone) {
                onDone();
            }
        };
        matchAnimFrame = requestAnimationFrame(animate);
    }
    function startTypewriter() {
        const text = "Analyse des sentiments en cours...";
        const el = document.getElementById('intro-typed-text');
        const nextBtn = document.getElementById('btn-intro-next');
        const cursor = document.querySelector('.cursor');
        const matchWrap = document.getElementById('match-progress');
        const matchFill = document.getElementById('match-fill');
        const matchValue = document.getElementById('match-value');
        const finalMsg = document.getElementById('intro-final-message');
        if (!el || !nextBtn) return;
        if (isIntroTyping) return;
        // Reset state
        if (introTypingTimeout) clearTimeout(introTypingTimeout);
        el.innerHTML = "";
        nextBtn.classList.add('hidden');
        if (cursor) cursor.style.display = 'none';
        if (matchWrap && matchFill && matchValue) {
            matchWrap.classList.remove('show');
            matchFill.style.width = '0%';
            matchValue.textContent = '0';
        }
        if (finalMsg) finalMsg.classList.remove('show');
        let i = 0;
        isIntroTyping = true;
        function type() {
            if (i < text.length) {
                el.insertAdjacentHTML('beforeend', text.charAt(i) === '\n' ? '<br>' : text.charAt(i));
                i++;
                introTypingTimeout = setTimeout(type, 50); // Slightly slower for "letter" feel
            } else {
                isIntroTyping = false;
                introTypingTimeout = setTimeout(() => {
                    if (cursor) cursor.style.display = 'none';
                    animateMatchProgress(1400, () => {
                        if (finalMsg) finalMsg.classList.add('show');
                        setTimeout(() => {
                            nextBtn.classList.remove('hidden'); // SHOW BUTTON
                            // Add a pulse effect to draw attention
                            nextBtn.classList.add('pulse-effect');
                            AudioManager.play('sparkle', { volume: 0.25 });
                        }, 300);
                    });
                }, 300);
            }
        }
        type();
    }
    // --- STEP 3: TIMER ---
    function startTimer() {
        const btnEnd = document.getElementById('btn-timer-end');
        const update = () => {
            const now = new Date().getTime();
            const dist = TARGET_DATE - now;
            if (dist < 0) {
                document.querySelector('.desc').innerText = "C'est l'heure !";
                document.getElementById('timer').style.display = 'none';
                btnEnd.classList.remove('hidden');
                AudioManager.play('unlock', { volume: 0.3 });
                return true;
            }
            document.getElementById('days').innerText = Math.floor(dist / (1000 * 60 * 60 * 24));
            document.getElementById('hours').innerText = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            document.getElementById('minutes').innerText = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
            document.getElementById('seconds').innerText = Math.floor((dist % (1000 * 60)) / 1000);
            return false;
        };
        if (!update()) setInterval(update, 1000);
        document.getElementById('force-skip-timer').onclick = () => showStep(4);
    }
    // --- STEP 4: DYNAMIC QUIZ ---
    const quizData = [
        {
            question: "Quelle est ma couleur préférée ?",
            options: ["Rouge", "Vert", "Jaune"],
            answer: 2
        },
        {
            question: "Qui est le plus beau/bello ?",
            options: [
                { text: "Charles Leclerc", img: "assets/leclerc.jpg" },
                { text: "Damon Salvatore", img: "assets/damon.jpg" },
                { text: "Lucille Cluzet", img: "assets/lucille.jpg" }
            ],
            answer: 2
        },
        {
            question: "C'est quoi ma date de naissance ?",
            options: ["5 Décembre", "11 Avril", "2 Juin"],
            answer: 2
        },
        {
            question: "Si je dois choisir entre une Ferrari et toi ?",
            options: ["La Ferrari (Vroum Vroum) 🏎️", "Joker 😅", "Toi, évidemment ❤️"],
            answer: 2
        }
    ];
    let currentQuizIndex = 0;
    const quizAttempts = {};
    const quizPositive = ["Bien vu 😌", "Exact ❤️", "Tu me connais trop bien", "Bonne réponse"];
    const quizNegative = ["Hmm… presque 😌", "Pas cette fois", "Joli essai", "Indice : écoute ton intuition"];
    function initQuiz() {
        currentQuizIndex = 0;
        loadQuestion();
    }
    function loadQuestion() {
        const q = quizData[currentQuizIndex];
        const questionEl = document.getElementById('quiz-question');
        const optionsEl = document.getElementById('quiz-options');
        const progressEl = document.getElementById('quiz-progress');
        const feedbackEl = document.getElementById('quiz-feedback');
        // Update UI
        questionEl.innerText = q.question;
        optionsEl.innerHTML = '';
        feedbackEl.innerText = '';
        // Progress Bar
        const progress = ((currentQuizIndex) / quizData.length) * 100;
        progressEl.style.width = `${progress}%`;
        // Render Options
        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            
            if (typeof opt === 'object' && opt.img) {
                // Option with Image
                btn.className += ' has-image';
                const img = document.createElement('img');
                img.src = opt.img;
                img.alt = opt.text;
                
                const span = document.createElement('span');
                span.innerText = opt.text;
                
                btn.appendChild(img);
                btn.appendChild(span);
            } else {
                // Simple Text
                btn.innerText = typeof opt === 'object' ? opt.text : opt;
            }
            btn.onclick = () => checkDynamicAnswer(btn, index === q.answer);
            optionsEl.appendChild(btn);
        });
    }
    function checkDynamicAnswer(btn, isCorrect) {
        const feedback = document.getElementById('quiz-feedback');
        const allBtns = document.querySelectorAll('.btn-option');
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Disable clicks
        allBtns.forEach(b => b.style.pointerEvents = 'none');
        const qKey = `q_${currentQuizIndex}`;
        quizAttempts[qKey] = (quizAttempts[qKey] || 0) + (isCorrect ? 0 : 1);
        const allowPass = !isCorrect && quizAttempts[qKey] >= 3;

        if (isCorrect || allowPass) {
            // Visual correct feedback
            btn.classList.add('correct');
            if (!btn.querySelector('.btn-mark')) {
                const mark = document.createElement('span');
                mark.className = 'btn-mark';
                mark.textContent = '❤️';
                btn.appendChild(mark);
            }
            if (feedback) {
                const msg = quizPositive[Math.floor(Math.random() * quizPositive.length)];
                feedback.textContent = msg;
            }
            AudioManager.play('ding', { volume: 0.25 });
            // Micro particles
            if (!prefersReduced) {
                const particles = document.createElement('div');
                particles.className = 'success-particles';
                btn.style.position = 'relative';
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('i');
                    p.textContent = ['❤️', '✨', '•'][i % 3];
                    p.style.left = `${10 + Math.random() * 80}%`;
                    p.style.top = `${10 + Math.random() * 50}%`;
                    particles.appendChild(p);
                }
                btn.appendChild(particles);
                setTimeout(() => particles.remove(), 850);
            }
            setTimeout(() => {
                btn.classList.remove('correct');
                const mark = btn.querySelector('.btn-mark');
                if (mark) mark.remove();
            }, 400);
            // Next Question or Finish
            setTimeout(() => {
                if (feedback) feedback.textContent = "";
                currentQuizIndex++;
                if (currentQuizIndex < quizData.length) {
                    loadQuestion();
                } else {
                    document.getElementById('quiz-progress').style.width = '100%';
                    celebrate();
                    showStep(5);
                }
            }, 650);
        } else {
            // Wrong Answer gentle feedback
            btn.classList.add('wrong');
            if (!prefersReduced) btn.classList.add('shake');
            if (feedback) {
                const msg = quizNegative[Math.floor(Math.random() * quizNegative.length)];
                feedback.textContent = msg;
            }
            AudioManager.play('bloop', { volume: 0.22 });
            setTimeout(() => {
                btn.classList.remove('wrong');
                btn.classList.remove('shake');
                if (feedback) feedback.textContent = "";
                allBtns.forEach(b => b.style.pointerEvents = 'all');
            }, 800);
        }
    }
    // Expose initQuiz for showStep() calls
    window.initQuiz = initQuiz;
    // --- STEP 6: PUZZLE ---
    function initPuzzle() {
        const container = document.getElementById('puzzle-container');
        const zone = document.getElementById('drop-zone');
        container.innerHTML = ''; zone.innerHTML = '';
        let currentOrder = [];
        // Attach check listener safely
        const checkBtn = document.getElementById('btn-puzzle-check');
        if (checkBtn) {
            checkBtn.onclick = checkPuzzle;
        }
        [...SECRET_PHRASE].sort(() => Math.random() - 0.5).forEach(word => {
            const btn = document.createElement('button');
            btn.className = 'puzzle-piece';
            btn.innerText = word;
            btn.onclick = () => {
                if (btn.parentElement === container) {
                    zone.appendChild(btn);
                    currentOrder.push(word);
                } else {
                    container.appendChild(btn);
                    currentOrder = currentOrder.filter(w => w !== word);
                }
                if (currentOrder.length > 0) zone.classList.add('highlight');
                else zone.classList.remove('highlight');
                if (currentOrder.length === SECRET_PHRASE.length) {
                    document.getElementById('btn-puzzle-check').classList.remove('hidden');
                } else {
                    document.getElementById('btn-puzzle-check').classList.add('hidden');
                }
            };
            container.appendChild(btn);
        });
    }
    function checkPuzzle() {
        console.log("Checking puzzle...");
        const zone = document.getElementById('drop-zone');
        const words = Array.from(zone.children).map(b => b.innerText);
        console.log("Current words:", words.join(' '));
        console.log("Target:", SECRET_PHRASE.join(' '));
        if (words.join('') === SECRET_PHRASE.join('')) {
            console.log("Puzzle Validated!");
            celebrate();
            showStep(7);
        } else {
            console.log("Puzzle Incorrect");
            zone.classList.add('shake');
            setTimeout(() => zone.classList.remove('shake'), 500);
        }
    }
    window.checkPuzzle = checkPuzzle;
    // --- STEP 8: SCRATCH CARD (Optimized) ---
    function initScratchCard() {
        const canvas = document.getElementById('scratch-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const wrapper = document.querySelector('.scratch-wrapper');
        // Reset state for safety
        canvas.style.opacity = '1';
        canvas.style.display = 'block';
        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        // Silver Gradient
        const grd = ctx.createLinearGradient(0, 0, width, height);
        grd.addColorStop(0, "#bdc3c7");
        grd.addColorStop(0.5, "#ece9e6"); // Shiny part
        grd.addColorStop(1, "#bdc3c7");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
        // Text
        ctx.fillStyle = '#7f8c8d';
        ctx.font = 'bold 20px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText("GRATTEZ ICI", width / 2, height / 2);
        ctx.globalCompositeOperation = 'destination-out';
        let isDrawing = false;
        function scratch(x, y) {
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
            checkProgress();
        }
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX || e.touches[0].clientX) - rect.left,
                y: (e.clientY || e.touches[0].clientY) - rect.top
            };
        };
        let scratchTimeout = null;
        canvas.onmousedown = canvas.ontouchstart = (e) => {
            isDrawing = true;
            AudioManager.play('scratch_loop', { volume: 0.2, cooldown: 50 });
            if (scratchTimeout) clearTimeout(scratchTimeout);
            scratchTimeout = setTimeout(() => {
                AudioManager.loop('scratch_loop', false);
            }, 1000);
        };
        canvas.onmouseup = canvas.ontouchend = () => {
            isDrawing = false;
            AudioManager.loop('scratch_loop', false);
            if (scratchTimeout) clearTimeout(scratchTimeout);
        };
        canvas.onmousemove = canvas.ontouchmove = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            scratch(pos.x, pos.y);
        };
        let completed = false;
        function checkProgress() {
            if (completed) return;
            const data = ctx.getImageData(0, 0, width, height).data;
            let count = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] === 0) count++;
            if (count / (width * height) > 0.4) {
                completed = true;
                canvas.style.transition = 'opacity 0.6s';
                canvas.style.opacity = '0';
                setTimeout(() => {
                    canvas.style.display = 'none';
                    celebrate();
                    AudioManager.play('reveal', { volume: 0.3 });
                    document.getElementById('btn-scratch-next').classList.remove('hidden');
                }, 600);
            }
        }
    }
    // --- AUDIO & MUSIC ---
    const bgMusic = document.getElementById('bg-music');
    const toggle = document.getElementById('music-toggle');
    const visualizer = document.querySelector('.music-visualizer');
    function playMusic() {
        if (!isMusicPlaying) {
            bgMusic.volume = 0.3;
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                updateMusicUI();
            }).catch(e => console.log("Autoplay blocked"));
        }
    }
    toggle.onclick = () => {
        if (isMusicPlaying) bgMusic.pause();
        else bgMusic.start ? bgMusic.start() : bgMusic.play();
        isMusicPlaying = !isMusicPlaying;
        updateMusicUI();
    };
    function updateMusicUI() {
        const icon = toggle.querySelector('i');
        if (isMusicPlaying) {
            icon.className = 'fa-solid fa-pause';
            visualizer.style.display = 'flex';
        } else {
            icon.className = 'fa-solid fa-play';
            // visualizer.style.display = 'none'; // Keep visualizer but static? Or hide.
        }
    }
    function initAudio() {
        const audio = document.getElementById('audio-player');
        if (isMusicPlaying) bgMusic.pause();
        audio.onended = () => {
            document.getElementById('audio-next-container').classList.remove('hidden');
            if (isMusicPlaying) bgMusic.start ? bgMusic.start() : bgMusic.play();
        };
    }
    // --- STEP 10: FINAL ---
    // --- STEP 10: FINAL APOTHEOSIS ---
    function initFinalCelebration() {
        const step10 = document.getElementById('step-10');
        // 1. Change Background
        document.body.classList.add('final-mode');
        // 2. Continuous Heart Rain
        const duration = 15 * 1000; // 15 seconds of intense rain, then softer?
        const end = Date.now() + duration;
        // Launch a first burst
        confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#ff0000', '#ff69b4', '#ffffff']
        });
        // Continuous delicate rain
        const interval = setInterval(function () {
            /*
            if (Date.now() > end) {
                return clearInterval(interval);
            }
            */
            // Keep it running indefinitely for maximum effect until they leave
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff0000', '#ffffff'],
                shapes: ['heart']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ff69b4', '#ffffff'],
                shapes: ['heart']
            });
        }, 50); // Every 50ms
    }
    window.initFinalCelebration = initFinalCelebration;
    // --- STEP 9: ENVELOPE ---
    // --- STEP 9: ENVELOPE & TYPEWRITER ---
    function initEnvelope() {
        const envelope = document.getElementById('envelope');
        const btnNext = document.getElementById('btn-letter-next');
        const letterTextEl = document.getElementById('typewriter-letter-text');
        const letterContainer = document.getElementById('letter-content');
        let isOpen = false;
        const fullText = `Mon Amour,
Je t'écris cette lettre numérique parce que les mots me manquent parfois quand on s'appelle. Je voulais prendre un moment, juste pour nous, pour te dire à quel point tu comptes pour moi.
Même si des kilomètres nous séparent aujourd'hui, je te sens près de moi à chaque instant. Chaque notification de toi illumine ma journée, chaque photo que tu m'envoies est un trésor, et chaque 'bonne nuit' me permet de dormir un peu mieux.
Je sais que la distance n'est pas facile. Il y a des soirs où j'aimerais juste pouvoir te serrer dans mes bras, sans rien dire. Mais je sais aussi que ce qu'on vit est rare, précieux, et plus fort que tout ça.
Merci d'être toi. Merci pour tes rires, ta patience, et tout l'amour que tu me donnes. J'ai tellement hâte de te retrouver pour de vrai.
Je t'aime, infiniment.
Ton Valentin.`;
        envelope.onclick = () => {
            if (isOpen) return;
            isOpen = true;
            // Open Envelope
            envelope.classList.add('open');
            // Wait for animation then start typing
            setTimeout(() => {
                startTypewriter();
            }, 1000);
        };
        function startTypewriter() {
            letterTextEl.innerHTML = '<span class="cursor-letter">|</span>';
            let i = 0;
            const speed = 50; // Slower typing (50ms)
            function type() {
                if (i < fullText.length) {
                    const char = fullText.charAt(i);
                    const currentHTML = letterTextEl.innerHTML;
                    const cleanHTML = currentHTML.replace('<span class="cursor-letter">|</span>', '');
                    letterTextEl.innerHTML = cleanHTML + (char === '\n' ? '<br>' : char) + '<span class="cursor-letter">|</span>';
                    // Auto scroll
                    letterContainer.scrollTop = letterContainer.scrollHeight;
                    i++;
                    setTimeout(type, speed);
                } else {
                    // Done
                    const currentHTML = letterTextEl.innerHTML;
                    letterTextEl.innerHTML = currentHTML.replace('<span class="cursor-letter">|</span>', '');
                    setTimeout(() => {
                        btnNext.classList.remove('hidden');
                        btnNext.classList.add('pulse-effect');
                    }, 500);
                }
            }
            type();
        }
    }
    window.initEnvelope = initEnvelope;
    function initParticles() {
        const container = document.getElementById('particles-js');
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'firefly';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 5 + 8) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(p);
        }
    }
    function celebrate() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff9a9e', '#fecfef', '#ffffff']
        });
        AudioManager.play('sparkle', { volume: 0.25 });
    }
    // --- NAVIGATION CLICKS ---
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
            initAudioUnlock();
            AudioManager.play('click_soft', { volume: 0.2 });
            showStep(parseInt(e.target.dataset.next));
        });
    });
    // --- STEP 5: COMIC READER ---
    function initComicReader() {
        const track = document.getElementById('comic-track');
        const btnPrev = document.getElementById('btn-comic-prev');
        const btnNext = document.getElementById('btn-comic-next');
        const progressEl = document.getElementById('comic-progress');
        const captionEl = document.getElementById('comic-caption-text');
        const btnEnd = document.getElementById('btn-comic-end');
        if (!track) return;
        // Data for 20 frames
        const totalFrames = 20;
        let currentFrame = 0;
        const captions = [
            "Il était une fois...",
            "Une rencontre inattendue.",
            "Un premier sourire.",
            "Quelques mots échangés.",
            "Un café (ou deux).",
            "Le temps qui s'arrête.",
            "Les premiers papillons.",
            "Une balade sous les étoiles.",
            "Ta main dans la mienne.",
            "Nos fous rires.",
            "Ces petits moments...",
            "Qui deviennent grands.",
            "Chaque jour avec toi.",
            "Est une aventure.",
            "Je me souviens de tout.",
            "De chaque détail.",
            "Et je réalise...",
            "Que c'est toi.",
            "Encore et toujours.",
            "Prête pour la suite ? ❤️"
        ];
        // Generate Frames
        track.innerHTML = '';
        for (let i = 0; i < totalFrames; i++) {
            const panel = document.createElement('div');
            panel.className = 'comic-panel';
            // Placeholder visuals: Frame number or Image
            // panel.innerHTML = `<img src="path/to/img${i+1}.jpg" onerror="this.style.display='none'"> <span>Page ${i+1}</span>`;
            // Simplified for now:
            panel.innerHTML = `<div style="font-size:3rem">🖼️ ${i + 1}</div>`;
            track.appendChild(panel);
        }
        const updateView = () => {
            // Use percentage for perfect alignment regardless of borders/padding
            track.style.transform = `translateX(-${currentFrame * 100}%)`;
            // Update UI
            progressEl.innerText = `Page ${currentFrame + 1} / ${totalFrames}`;
            captionEl.innerText = captions[currentFrame] || "...";
            btnPrev.disabled = currentFrame === 0;
            // Handle Next Button & End
            if (currentFrame === totalFrames - 1) {
                btnNext.disabled = true;
                btnNext.innerText = "Fin";
                // UNLOCK
                if (btnEnd.classList.contains('hidden')) {
                    btnEnd.classList.remove('hidden');
                    celebrate(); // Small confetti for finishing reading
                }
            } else {
                btnNext.disabled = false;
                btnNext.innerText = "Suivant →";
            }
        };
        btnPrev.onclick = () => {
            if (currentFrame > 0) {
                currentFrame--;
                updateView();
            }
        };
        btnNext.onclick = () => {
            if (currentFrame < totalFrames - 1) {
                currentFrame++;
                updateView();
            }
        };
        // Handle Resize
        window.addEventListener('resize', updateView);
        // Init
        // Wait a tick for layout
        setTimeout(updateView, 100);
    }
    // Expose
    window.initComicReader = initComicReader;
    document.getElementById('dev-reset-btn').onclick = (e) => {
        e.preventDefault();
        if (confirm("↻ Recommencer l'expérience ?")) {
            localStorage.removeItem('vday_step_v3');
            location.reload();
        }
    };

    // --- UX PROGRESS ---
    function updateProgress(stepNumber) {
        const fill = document.getElementById('ux-progress-fill');
        const label = document.getElementById('ux-progress-label');
        if (!fill || !label) return;
        const total = STEP_LABELS.length;
        const idx = Math.min(stepNumber + 1, total);
        const pct = Math.round((idx / total) * 100);
        fill.style.width = `${pct}%`;
        label.textContent = `Chapitre ${idx} / ${total} — ${STEP_LABELS[idx - 1] || ''}`;
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced) {
            const toast = document.getElementById('ux-toast');
            if (toast) {
                toast.textContent = "Étape validée ✅";
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 1000);
            }
        }
    }

    // --- SFX TOGGLE ---
    const sfxToggle = document.getElementById('sfx-toggle');
    if (sfxToggle) {
        const syncIcon = () => {
            sfxToggle.textContent = AudioManager.isMuted() ? '🔇' : '🔊';
        };
        syncIcon();
        sfxToggle.addEventListener('click', () => {
            initAudioUnlock();
            const next = !AudioManager.isMuted();
            AudioManager.setMuted(next);
            syncIcon();
            if (!next) AudioManager.play('click_soft', { volume: 0.2 });
        });
    }

    // Unlock audio on first interaction
    document.addEventListener('pointerdown', (e) => {
        initAudioUnlock();
        AudioManager.play('click_soft', { volume: 0.15, cooldown: 90 });
    });
    document.addEventListener('keydown', initAudioUnlock, { once: true });
});
