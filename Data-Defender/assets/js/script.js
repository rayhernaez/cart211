document.addEventListener("DOMContentLoaded", function () {
    /* background audio loop */
    (function () {
        var base = (location.pathname.indexOf("/play/") !== -1 || location.pathname.indexOf("/result/") !== -1) ? ".." : ".";
        var bgm = new Audio(base + "/assets/audio/glitch-sound.mp3");
        bgm.loop = true;
        bgm.volume = 0.2;
        var startAudio = function () {
            bgm.play().catch(function () { });
        };
        startAudio();
        var unlock = function () {
            startAudio();
            document.removeEventListener("click", unlock);
            document.removeEventListener("keydown", unlock);
            document.removeEventListener("touchstart", unlock);
        };
        document.addEventListener("click", unlock);
        document.addEventListener("keydown", unlock);
        document.addEventListener("touchstart", unlock);
    })();

    function getProgress() {
        // reads progress from localStorage; creates a new one if empty
        try {
            var raw = localStorage.getItem("ddProgress");
            if (raw) return JSON.parse(raw);
        } catch (err) { }
        return { answers: {} };
    }

    function saveProgress(data) {
        localStorage.setItem("ddProgress", JSON.stringify(data));
    }

    function formatDate(dateLike) {
        // returns date
        var d = dateLike ? new Date(dateLike) : new Date();
        return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(d);
    }

    function letterToIndex(letter) {
        // "A" -> 0, "B" -> 1, "C" -> 2
        return letter.charCodeAt(0) - 65;
    }

    // Detect where we are (which page)
    var path = location.pathname;
    var sceneMatch = path.match(/scene-(\d+)\.html$/i);
    var sceneNumber = sceneMatch ? parseInt(sceneMatch[1], 10) : null;
    var onPassPage = path.indexOf("/result/pass.html") !== -1;
    var onFailPage = path.indexOf("/result/fail.html") !== -1;
    var onPlayOrResult = path.indexOf("/play/") !== -1 || path.indexOf("/result/") !== -1;

    // Correct answers per scene:
    // 1:B, 2:A, 3:A, 4:B, 5:C, 6:C, 7:C, 8:A
    var CORRECT = { 1: "B", 2: "A", 3: "A", 4: "B", 5: "C", 6: "C", 7: "C", 8: "A" };

    // Disable play during quiz
    // This stops people from restarting mid-quiz by clicking the nav
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

    // Scene 1 alias popup
    // When a new scene 1 starts, clear old progress and ask for an alias.
    if (sceneNumber === 1) {
        localStorage.removeItem("ddProgress");
    }

    if (sceneNumber === 1) {
        var overlay = document.getElementById("alias-modal");
        var aliasInput = document.getElementById("aliasInput");
        var aliasOk = document.getElementById("aliasOk");
        var aliasError = document.getElementById("aliasError");

        if (overlay && aliasInput && aliasOk && aliasError) {
            // Show modal
            overlay.classList.add("show");

            // Move focus into the input (short delay so the modal is painted first)
            setTimeout(function () {
                aliasInput.focus();
            }, 0);

            function submitAlias() {
                var val = (aliasInput.value || "").trim();

                // Basic validation: 1–12 characters
                if (val.length < 1 || val.length > 12) {
                    aliasError.textContent = "Alias must be 1–12 characters.";
                    aliasInput.focus();
                    return;
                }

                // Save alias + start time
                var prog = getProgress();
                prog.alias = val;
                prog.startedAt = new Date().toISOString();
                saveProgress(prog);

                // This prevents the browser warning about aria-hidden on focused content
                var focusTarget = document.querySelector(".choices li") || document.querySelector(".menu a");
                aliasInput.blur();
                aliasOk.blur();
                if (focusTarget) focusTarget.focus();

                // Hide modal
                overlay.classList.remove("show");
            }

            aliasOk.addEventListener("click", submitAlias);

            aliasInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    submitAlias();
                }
            });
        }
    }

    // Scene pages
    var choiceList = document.querySelector(".choices");
    var nextBtn = document.querySelector(".next-btn");

    if (sceneNumber && choiceList) {
        // Find original <li> items and remember which one is correct
        var originalItems = Array.prototype.slice.call(choiceList.querySelectorAll("li"));
        var correctIndex = letterToIndex(CORRECT[sceneNumber]); // 0/1/2
        var correctLi = originalItems[correctIndex];            // correct node BEFORE shuffle

        // Shuffle the <li> visually
        var itemsToShuffle = Array.prototype.slice.call(originalItems);
        for (var i2 = itemsToShuffle.length - 1; i2 > 0; i2--) {
            var j = Math.floor(Math.random() * (i2 + 1));
            var temp = itemsToShuffle[i2];
            itemsToShuffle[i2] = itemsToShuffle[j];
            itemsToShuffle[j] = temp;
        }
        // Put the shuffled items back into the list
        for (var k = 0; k < itemsToShuffle.length; k++) {
            choiceList.appendChild(itemsToShuffle[k]);
        }

        // Make each choice clickable and keyboard friendly
        var items = Array.prototype.slice.call(choiceList.querySelectorAll("li"));
        for (var m = 0; m < items.length; m++) {
            items[m].setAttribute("tabindex", "0");
            items[m].classList.add("choice-item");

            // Selecting a choice
            (function (li) {
                function selectThis() {
                    // remove "selected" from all, then add to the one you clicked
                    for (var n = 0; n < items.length; n++) {
                        items[n].classList.remove("selected");
                    }
                    li.classList.add("selected");

                    // show NEXT button after a choice is picked
                    if (nextBtn) nextBtn.classList.add("show");
                }

                li.addEventListener("click", selectThis);
                li.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectThis();
                    }
                });
            })(items[m]);
        }

        // When NEXT is clicked, save whether your selection is correct
        if (nextBtn) {
            nextBtn.addEventListener("click", function (e) {
                var selected = choiceList.querySelector("li.selected");
                if (!selected) {
                    // If they try to move on without picking, stop the link
                    e.preventDefault();
                    return;
                }

                // Compare the selected node to the correct node we remembered before shuffle
                var isCorrect = (selected === correctLi);

                var prog = getProgress();
                prog.answers[sceneNumber] = { correct: isCorrect ? 1 : 0 };
                saveProgress(prog);

                // On the last scene, compute the final score and decide pass/fail
                if (sceneNumber === 8) {
                    e.preventDefault();

                    var score = 0;
                    for (var s = 1; s <= 8; s++) {
                        var v = prog.answers[s];
                        if (v && typeof v === "object" && v.correct != null) {
                            score += Number(v.correct);
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

    // Result pages
    if (onPassPage || onFailPage) {
        var prog = getProgress();

        // If no answers exist, send them to the start of the quiz.
        if (!prog.answers || Object.keys(prog.answers).length === 0) {
            window.location.replace("../play/scene-1.html");
            return;
        }

        // Make sure we have a numeric score (recompute if missing)
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

        // Ensure we are on the correct result page
        var passed = prog.score >= 6;
        if (onPassPage && !passed) {
            window.location.replace("./fail.html");
            return;
        }
        if (onFailPage && passed) {
            window.location.replace("./pass.html");
            return;
        }

        // Replace [ALIAS], [SCORE], [DATE] in the visible text
        var section = document.querySelector("main section") || document.body;
        var aliasText = prog.alias || "Agent";
        var dateText = formatDate(prog.finishedAt || Date.now());

        // Walk through text nodes and replace tokens
        var allEls = section.querySelectorAll("*");
        for (var t = 0; t < allEls.length; t++) {
            var node = allEls[t];
            for (var u = 0; u < node.childNodes.length; u++) {
                var child = node.childNodes[u];
                if (child.nodeType === 3) {
                    var txt = child.textContent;
                    if (txt.indexOf("[ALIAS]") !== -1 ||
                        txt.indexOf("[SCORE]") !== -1 ||
                        txt.indexOf("[DATE]") !== -1) {
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