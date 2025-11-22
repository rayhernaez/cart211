// assets/js/script.js
document.addEventListener("DOMContentLoaded", function () {
    // Background audio loop
    (function () {
        // Figure out the right path to the audio file depending on the folder we are in
        var onPlayOrResult = location.pathname.indexOf("/play/") !== -1 || location.pathname.indexOf("/result/") !== -1;
        var basePath = onPlayOrResult ? ".." : ".";
        var bgm = new Audio(basePath + "/assets/audio/glitch-sound.mp3");
        bgm.loop = true;
        bgm.volume = 0.2;

        // Try to start right away
        function tryStartAudio() {
            bgm.play().catch(function () {
            });
        }
        tryStartAudio();

        // First user interaction will "unlock" audio, then remove these listeners
        function unlockAudio() {
            tryStartAudio();
            document.removeEventListener("click", unlockAudio);
            document.removeEventListener("keydown", unlockAudio);
            document.removeEventListener("touchstart", unlockAudio);
        }
        document.addEventListener("click", unlockAudio);
        document.addEventListener("keydown", unlockAudio);
        document.addEventListener("touchstart", unlockAudio);
    })();

    // Read progress from localStorage (or return a fresh empty one)
    function getProgress() {
        try {
            var raw = localStorage.getItem("ddProgress");
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (err) {
            // If JSON is broken or not available, we'll just start fresh
        }
        return { answers: {} };
    }

    // Save progress back to localStorage
    function saveProgress(data) {
        localStorage.setItem("ddProgress", JSON.stringify(data));
    }

    // Turn a date into a friendly string
    function formatDate(dateLike) {
        var d = dateLike ? new Date(dateLike) : new Date();
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(d);
    }

    // Convert "A"/"B"/"C" into 0/1/2
    function letterToIndex(letter) {
        return letter.charCodeAt(0) - 65;
    }

    // Page detection
    var path = location.pathname;
    var sceneMatch = path.match(/scene-(\d+)\.html$/i);
    var sceneNumber = sceneMatch ? parseInt(sceneMatch[1], 10) : null;

    var onPassPage = path.indexOf("/result/pass.html") !== -1;
    var onFailPage = path.indexOf("/result/fail.html") !== -1;
    var onPlayOrResult = path.indexOf("/play/") !== -1 || path.indexOf("/result/") !== -1;

    // Correct answers for each scene (A/B/C)
    // 1:B, 2:A, 3:A, 4:B, 5:C, 6:C, 7:C, 8:A
    var CORRECT = { 1: "B", 2: "A", 3: "A", 4: "B", 5: "C", 6: "C", 7: "C", 8: "A" };

    // Disable play
    if (onPlayOrResult) {
        var menuLinks = document.querySelectorAll(".menu a");
        var playLink = null;
        for (var i = 0; i < menuLinks.length; i++) {
            if (menuLinks[i].textContent.trim().toUpperCase() === "PLAY") {
                playLink = menuLinks[i];
                break;
            }
        }
        if (playLink) {
            playLink.setAttribute("aria-disabled", "true");
            playLink.setAttribute("tabindex", "-1");
            playLink.classList.add("is-disabled");
            playLink.addEventListener("click", function (e) {
                e.preventDefault();
            });
        }
    }

    // Alias popup
    if (sceneNumber === 1) {
        // Clear any old run
        localStorage.removeItem("ddProgress");
    }

    if (sceneNumber === 1) {
        var overlay = document.getElementById("alias-modal");
        var aliasInput = document.getElementById("aliasInput");
        var aliasOk = document.getElementById("aliasOk");
        var aliasError = document.getElementById("aliasError");

        if (overlay && aliasInput && aliasOk && aliasError) {
            // Show the modal
            overlay.classList.add("show");

            // Focus the input
            setTimeout(function () {
                aliasInput.focus();
            }, 0);

            function submitAlias() {
                var val = (aliasInput.value || "").trim();

                // Must be 1 to 12 characters
                if (val.length < 1 || val.length > 12) {
                    aliasError.textContent = "Alias must be 1–12 characters.";
                    aliasInput.focus();
                    return;
                }

                // Save alias and start time
                var prog = getProgress();
                prog.alias = val;
                prog.startedAt = new Date().toISOString();
                saveProgress(prog);

                // Move focus outside the modal before hiding it
                var focusTarget = document.querySelector(".choices li") || document.querySelector(".menu a");
                aliasInput.blur();
                aliasOk.blur();
                if (focusTarget) {
                    focusTarget.focus();
                }

                // Hide the modal
                overlay.classList.remove("show");
            }

            // Click OK button
            aliasOk.addEventListener("click", submitAlias);

            // Press Enter inside the input
            aliasInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    submitAlias();
                }
            });
        }
    }

    // Scene pages 1-8
    var choiceList = document.querySelector(".choices");
    var nextBtn = document.querySelector(".next-btn");

    if (sceneNumber && choiceList) {
        // Grab the original li items
        var originalItems = Array.prototype.slice.call(choiceList.querySelectorAll("li"));

        // Remember which one is correct before shuffling
        var correctIndex = letterToIndex(CORRECT[sceneNumber]); // 0/1/2
        var correctLi = originalItems[correctIndex];

        // Shuffle the li visually
        var shuffled = Array.prototype.slice.call(originalItems);
        for (var s = shuffled.length - 1; s > 0; s--) {
            var j = Math.floor(Math.random() * (s + 1));
            var temp = shuffled[s];
            shuffled[s] = shuffled[j];
            shuffled[j] = temp;
        }
        // Put the shuffled items back into the list
        for (var a = 0; a < shuffled.length; a++) {
            choiceList.appendChild(shuffled[a]);
        }

        // Make each choice clickable and keyboard-accessible
        var items = Array.prototype.slice.call(choiceList.querySelectorAll("li"));
        for (var b = 0; b < items.length; b++) {
            items[b].setAttribute("tabindex", "0");
            items[b].classList.add("choice-item");

            (function (li) {
                function selectThis() {
                    // Remove selected from all items first
                    for (var c = 0; c < items.length; c++) {
                        items[c].classList.remove("selected");
                    }
                    // Add selected to the one we clicked
                    li.classList.add("selected");

                    // Show NEXT button now that a choice is made
                    if (nextBtn) {
                        nextBtn.classList.add("show");
                    }
                }

                // Click to select
                li.addEventListener("click", selectThis);

                // Enter/Space to select (keyboard)
                li.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectThis();
                    }
                });
            })(items[b]);
        }

        // When NEXT is clicked, save the result for this scene
        if (nextBtn) {
            nextBtn.addEventListener("click", function (e) {
                var selected = choiceList.querySelector("li.selected");
                if (!selected) {
                    // No pick? Don't let them move on
                    e.preventDefault();
                    return;
                }

                // Compare the actual selected li with the correct li we remembered earlier
                var isCorrect = (selected === correctLi);

                var prog = getProgress();
                prog.answers[sceneNumber] = { correct: isCorrect ? 1 : 0 };
                saveProgress(prog);

                // If this is the last scene (8), total the score and go to pass/fail
                if (sceneNumber === 8) {
                    e.preventDefault();

                    var score = 0;
                    for (var q = 1; q <= 8; q++) {
                        var ans = prog.answers[q];
                        if (ans && typeof ans === "object" && ans.correct != null) {
                            score += Number(ans.correct);
                        }
                    }

                    prog.score = score;
                    prog.finishedAt = new Date().toISOString();
                    saveProgress(prog);

                    if (score >= 6) {
                        window.location.href = "../result/pass.html";
                    } else {
                        window.location.href = "../result/fail.html";
                    }
                }
            });
        }
    }

    // Result page (pass/fail)
    if (onPassPage || onFailPage) {
        var prog = getProgress();

        // If they somehow got here with no answers, send them to the start
        if (!prog.answers || Object.keys(prog.answers).length === 0) {
            window.location.replace("../play/scene-1.html");
            return;
        }

        // Make sure we have a score number (recompute if missing)
        if (typeof prog.score !== "number") {
            var recomputed = 0;
            for (var r = 1; r <= 8; r++) {
                var vr = prog.answers[r];
                if (vr && typeof vr === "object" && vr.correct != null) {
                    recomputed += Number(vr.correct);
                }
            }
            prog.score = recomputed;
            saveProgress(prog);
        }

        // Send them to the correct result page if they are on the wrong one
        var passed = prog.score >= 6;
        if (onPassPage && !passed) {
            window.location.replace("./fail.html");
            return;
        }
        if (onFailPage && passed) {
            window.location.replace("./pass.html");
            return;
        }

        // Replace the tokens in the visible text
        var section = document.querySelector("main section") || document.body;
        var aliasText = prog.alias || "Agent";
        var dateText = formatDate(prog.finishedAt || Date.now());

        // Walk through text nodes and replace [ALIAS], [SCORE], [DATE]
        var allEls = section.querySelectorAll("*");
        for (var t = 0; t < allEls.length; t++) {
            var node = allEls[t];
            for (var u = 0; u < node.childNodes.length; u++) {
                var child = node.childNodes[u];
                if (child.nodeType === 3) { // Text node
                    var txt = child.textContent;
                    if (txt.indexOf("[ALIAS]") !== -1 || txt.indexOf("[SCORE]") !== -1 || txt.indexOf("[DATE]") !== -1) {
                        txt = txt.replace(/\[ALIAS\]/g, aliasText)
                            .replace(/\[SCORE\]/g, String(prog.score))
                            .replace(/\[DATE\]/g, dateText);
                        child.textContent = txt;
                    }
                }
            }
        }
    }
});