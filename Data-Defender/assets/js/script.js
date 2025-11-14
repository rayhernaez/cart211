// assets/js/script.js
document.addEventListener("DOMContentLoaded", () => {
    /* ---------- Disable PLAY nav on scene/result pages ---------- */
    const isPlayOrResult =
        location.pathname.includes("/play/") || location.pathname.includes("/result/");
    const menuLinks = document.querySelectorAll(".menu a");
    let playLink = null;
    menuLinks.forEach((a) => {
        if (a.textContent.trim().toUpperCase() === "PLAY") playLink = a;
    });
    if (isPlayOrResult && playLink) {
        playLink.setAttribute("aria-disabled", "true");
        playLink.setAttribute("tabindex", "-1");
        playLink.classList.add("is-disabled");
        playLink.addEventListener("click", (e) => e.preventDefault());
    }

    /* ---------- Helpers ---------- */
    const sceneMatch = location.pathname.match(/scene-(\d+)\.html$/i);
    const sceneNumber = sceneMatch ? parseInt(sceneMatch[1], 10) : null;

    const isPassPage = location.pathname.includes("/result/pass.html");
    const isFailPage = location.pathname.includes("/result/fail.html");

    const CORRECT = { 1: "B", 2: "A", 3: "A", 4: "B", 5: "C", 6: "C", 7: "C", 8: "A" };
    const letterToIdx = (letter) => letter.charCodeAt(0) - 65; // A->0

    const loadProgress = () => {
        try { return JSON.parse(localStorage.getItem("ddProgress")) || { answers: {} }; }
        catch { return { answers: {} }; }
    };
    const saveProgress = (data) => localStorage.setItem("ddProgress", JSON.stringify(data));

    const formatDate = (dateLike) => {
        const d = dateLike ? new Date(dateLike) : new Date();
        // Example: November 14, 2025
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric", month: "long", day: "numeric"
        }).format(d);
    };

    /* ---------- Reset on Scene 1 ---------- */
    if (sceneNumber === 1) {
        localStorage.removeItem("ddProgress");
    }

    /* ---------- Alias modal (Scene 1 only) ---------- */
    if (sceneNumber === 1) {
        const overlay = document.getElementById("alias-modal");
        const input = document.getElementById("aliasInput");
        const okBtn = document.getElementById("aliasOk");
        const err = document.getElementById("aliasError");

        if (overlay && input && okBtn) {
            overlay.classList.add("show");
            overlay.setAttribute("aria-hidden", "false");
            setTimeout(() => input.focus(), 0);

            const submitAlias = () => {
                const val = (input.value || "").trim();
                if (val.length < 1 || val.length > 12) {
                    err.textContent = "Alias must be 1–12 characters.";
                    input.focus();
                    return;
                }
                const prog = loadProgress();
                prog.alias = val;
                prog.startedAt = new Date().toISOString();
                saveProgress(prog);

                // Move focus OUTSIDE before hiding to avoid aria-hidden warning
                const focusTarget =
                    document.querySelector(".choices li") ||
                    document.querySelector(".menu a");
                input.blur();
                okBtn.blur();
                if (focusTarget) focusTarget.focus();

                overlay.classList.remove("show");
                overlay.setAttribute("aria-hidden", "true");
            };

            okBtn.addEventListener("click", submitAlias);
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") submitAlias();
            });
        }
    }

    /* ---------- Scene page behavior (shuffle + selection + scoring) ---------- */
    const list = document.querySelector(".choices");
    const nextBtn = document.querySelector(".next-btn");

    if (sceneNumber && list) {
        // Capture original order & correct LI
        const originalItems = Array.from(list.querySelectorAll("li"));
        const correctIdx = letterToIdx(CORRECT[sceneNumber]);
        const correctLi = originalItems[correctIdx];

        // Fisher–Yates shuffle
        const itemsToShuffle = Array.from(originalItems);
        for (let i = itemsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemsToShuffle[i], itemsToShuffle[j]] = [itemsToShuffle[j], itemsToShuffle[i]];
        }
        itemsToShuffle.forEach((li) => list.appendChild(li));

        // Make selectable
        const items = Array.from(list.querySelectorAll("li"));
        items.forEach((li) => {
            li.setAttribute("tabindex", "0");
            li.classList.add("choice-item");
            const select = () => {
                items.forEach((i) => i.classList.remove("selected"));
                li.classList.add("selected");
                if (nextBtn) nextBtn.classList.add("show");
            };
            li.addEventListener("click", select);
            li.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
            });
        });

        // Save & proceed
        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                const selected = list.querySelector("li.selected");
                if (!selected) { e.preventDefault(); return; }

                const isCorrect = selected === correctLi;
                const prog = loadProgress();
                prog.answers[sceneNumber] = { correct: isCorrect ? 1 : 0 };
                saveProgress(prog);

                if (sceneNumber === 8) {
                    e.preventDefault();
                    // total score
                    let score = 0;
                    for (let i = 1; i <= 8; i++) {
                        const v = prog.answers[i];
                        if (v && typeof v === "object" && v.correct != null) {
                            score += Number(v.correct);
                        }
                    }
                    prog.score = score;
                    prog.finishedAt = new Date().toISOString(); // save completion time
                    saveProgress(prog);

                    if (score >= 6) window.location.href = "../result/pass.html";
                    else window.location.href = "../result/fail.html";
                }
            });
        }
    }

    /* ---------- Result pages: fill alias/score/date & guard ---------- */
    if (isPassPage || isFailPage) {
        const prog = loadProgress();
        // compute score if missing (defensive)
        if (typeof prog.score !== "number") {
            let s = 0;
            if (prog.answers) {
                for (let i = 1; i <= 8; i++) {
                    const v = prog.answers[i];
                    if (v && typeof v === "object" && v.correct != null) s += Number(v.correct);
                }
            }
            prog.score = s;
            saveProgress(prog);
        }

        // If no attempt, send to start
        if (!prog.answers || Object.keys(prog.answers).length === 0) {
            window.location.replace("../play/scene-1.html");
            return;
        }

        // Enforce correct page
        const passed = prog.score >= 6;
        if (isPassPage && !passed) {
            window.location.replace("./fail.html");
            return;
        }
        if (isFailPage && passed) {
            window.location.replace("./pass.html");
            return;
        }

        // Token replacement across the section
        const section = document.querySelector("main section") || document.body;
        const alias = prog.alias || "Agent";
        const dateText = formatDate(prog.finishedAt || Date.now());
        const replaceTokens = (el) => {
            el.querySelectorAll("*").forEach((node) => {
                if (!node.childNodes) return;
                node.childNodes.forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        let t = child.textContent;
                        if (t.includes("[ALIAS]") || t.includes("[SCORE]") || t.includes("[DATE]")) {
                            t = t.replaceAll("[ALIAS]", alias)
                                .replaceAll("[SCORE]", String(prog.score))
                                .replaceAll("[DATE]", dateText);
                            child.textContent = t;
                        }
                    }
                });
            });
        };
        replaceTokens(section);
    }
});