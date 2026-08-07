document.addEventListener('DOMContentLoaded', () => {

    // Screen Management
    const startScreen = document.getElementById('startScreen');
    const modeScreen = document.getElementById('modeScreen');
    const simulatorScreen = document.getElementById('simulatorScreen');

    const btnStartApp = document.getElementById('btnStartApp');
    const btnChooseExplore = document.getElementById('btnChooseExplore');
    const btnChooseTest = document.getElementById('btnChooseTest');
    const btnHome = document.getElementById('btnHome');
    const btnHelp = document.getElementById('btnHelp');

    const instructionModal = document.getElementById('instructionModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnStartSimulatorFromModal = document.getElementById('btnStartSimulatorFromModal');
    const btnShowAckModal = document.getElementById('btnShowAckModal');

    const modeIndicatorLabel = document.getElementById('modeIndicatorLabel');
    const exploreControls = document.getElementById('exploreControls');
    const testControls = document.getElementById('testControls');

    let currentMode = 'EXPLORE';

    function switchScreen(targetScreen) {
        if (!targetScreen) return;
        [startScreen, modeScreen, simulatorScreen].forEach(s => {
            if (s) s.classList.remove('active');
        });
        targetScreen.classList.add('active');
    }

    if (btnStartApp) {
        btnStartApp.onclick = function() { switchScreen(modeScreen); };
    }

    if (btnChooseExplore) {
        btnChooseExplore.onclick = function() {
            currentMode = 'EXPLORE';
            if (modeIndicatorLabel) modeIndicatorLabel.innerText = 'Clinical Exploration';
            if (exploreControls) exploreControls.classList.remove('hidden');
            if (testControls) testControls.classList.add('hidden');
            switchScreen(simulatorScreen);
            if (instructionModal) instructionModal.classList.remove('hidden');
        };
    }

    if (btnChooseTest) {
        btnChooseTest.onclick = function() {
            currentMode = 'TEST';
            if (modeIndicatorLabel) modeIndicatorLabel.innerText = 'Patient Assessment';
            if (exploreControls) exploreControls.classList.add('hidden');
            if (testControls) testControls.classList.remove('hidden');
            switchScreen(simulatorScreen);
            if (instructionModal) instructionModal.classList.remove('hidden');
            initTestCases();
        };
    }

    if (btnStartSimulatorFromModal) {
        btnStartSimulatorFromModal.onclick = function() {
            if (instructionModal) instructionModal.classList.add('hidden');
            if (currentMode === 'EXPLORE') startTutorial();
        };
    }

    if (btnCloseModal) {
        btnCloseModal.onclick = function() {
            if (instructionModal) instructionModal.classList.add('hidden');
        };
    }

    if (btnHome) btnHome.onclick = function() { switchScreen(modeScreen); };
    if (btnHelp) btnHelp.onclick = function() { if (instructionModal) instructionModal.classList.remove('hidden'); };
    if (btnShowAckModal) btnShowAckModal.onclick = function() { switchScreen(startScreen); };

    // Simulation Engine & Tools
    const target = document.getElementById('fixationTarget');
    const occluder = document.getElementById('occluderPaddle');
    const prism = document.getElementById('prismGlass');

    const irisOD = document.getElementById('irisOD');
    const irisOS = document.getElementById('irisOS');
    const reflexOD = document.getElementById('reflexOD');
    const reflexOS = document.getElementById('reflexOS');

    const tropiaH = document.getElementById('tropiaH');
    const tropiaV = document.getElementById('tropiaV');
    const phoriaH = document.getElementById('phoriaH');
    const phoriaV = document.getElementById('phoriaV');

    const btnOD = document.getElementById('btnOD');
    const btnPenlight = document.getElementById('btnPenlight');
    const btnLinkTools = document.getElementById('btnLinkTools');
    const btnRotatePrism = document.getElementById('btnRotatePrism');
    const prismPower = document.getElementById('prismPower');

    // Standalone Eye Coordinates
    const OD_CENTER = { x: 235, y: 135 };
    const OS_CENTER = { x: 440, y: 135 };

    let isLightOn = false;
    let isLinked = false;
    let activeTool = null;
    let offset = { x: 0, y: 0 };
    let currentEyeMode = 'OD';
    let prismAngle = 0;

    // Drag Coordinates for Mobile Touch & Mouse
    function getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function startDrag(e, tool) {
        activeTool = tool;
        const pos = getEventPos(e);
        const rect = tool.getBoundingClientRect();
        offset.x = pos.x - rect.left;
        offset.y = pos.y - rect.top;
    }

    function moveDrag(e) {
        if (!activeTool) return;

        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const pos = getEventPos(e);
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();

        let x = pos.x - canvasRect.left - offset.x;
        let y = pos.y - canvasRect.top - offset.y;

        x = Math.max(0, Math.min(canvasRect.width - activeTool.offsetWidth, x));
        y = Math.max(0, Math.min(canvasRect.height - activeTool.offsetHeight, y));

        activeTool.style.left = x + 'px';
        activeTool.style.top = y + 'px';

        if (isLinked && activeTool === occluder && prism) {
            prism.style.left = (x + 110) + 'px';
            prism.style.top = y + 'px';
        }

        updateEyeMovement();
    }

    function endDrag() {
        activeTool = null;
    }

    [target, occluder, prism].forEach(tool => {
        if (!tool) return;
        tool.addEventListener('mousedown', (e) => startDrag(e, tool));
        tool.addEventListener('touchstart', (e) => startDrag(e, tool), { passive: false });
    });

    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    if (btnLinkTools) {
        btnLinkTools.onclick = function() {
            isLinked = !isLinked;
            btnLinkTools.classList.toggle('active', isLinked);
        };
    }

    if (btnRotatePrism && prism) {
        btnRotatePrism.onclick = function() {
            prismAngle = (prismAngle + 90) % 360;
            prism.style.transform = `rotate(${prismAngle}deg)`;
        };
    }

    if (btnPenlight && reflexOD && reflexOS) {
        btnPenlight.onclick = function() {
            isLightOn = !isLightOn;
            btnPenlight.classList.toggle('active', isLightOn);
            reflexOD.classList.toggle('hidden', !isLightOn);
            reflexOS.classList.toggle('hidden', !isLightOn);
        };
    }

    if (btnOD) {
        btnOD.onclick = function() {
            currentEyeMode = currentEyeMode === 'OD' ? 'OS' : 'OD';
            btnOD.innerText = `Fixing Eye: ${currentEyeMode}`;
            updateEyeMovement();
        };
    }

    function updateEyeMovement() {
        if (!target || !occluder || !prism || !irisOD || !irisOS) return;

        const tX = target.offsetLeft + 13;
        const tY = target.offsetTop + 13;

        const occX = occluder.offsetLeft + 47;
        const occY = occluder.offsetTop + 47;

        const pX = prism.offsetLeft + 47;
        const pY = prism.offsetTop + 47;

        const isODCovered = Math.hypot(occX - OD_CENTER.x, occY - OD_CENTER.y) < 65;
        const isOSCovered = Math.hypot(occX - OS_CENTER.x, occY - OS_CENTER.y) < 65;

        const isODPrism = Math.hypot(pX - OD_CENTER.x, pY - OD_CENTER.y) < 65;
        const isOSPrism = Math.hypot(pX - OS_CENTER.x, pY - OS_CENTER.y) < 65;

        let odX = (tX - OD_CENTER.x) * 0.1;
        let odY = (tY - OD_CENTER.y) * 0.1;
        let osX = (tX - OS_CENTER.x) * 0.1;
        let osY = (tY - OS_CENTER.y) * 0.1;

        let curTropH = 0, curTropV = 0, curPhorH = 0, curPhorV = 0;

        if (currentMode === 'EXPLORE') {
            curTropH = parseFloat(tropiaH ? tropiaH.value : 0) || 0;
            curTropV = parseFloat(tropiaV ? tropiaV.value : 0) || 0;
            curPhorH = parseFloat(phoriaH ? phoriaH.value : 0) || 0;
            curPhorV = parseFloat(phoriaV ? phoriaV.value : 0) || 0;
        } else {
            curTropH = activePatientCase.tropH;
            curTropV = activePatientCase.tropV;
            curPhorH = activePatientCase.phorH;
            curPhorV = activePatientCase.phorV;
        }

        if (currentEyeMode === 'OD') {
            osX += curTropH * 0.5;
            osY += curTropV * 0.5;
        } else {
            odX += curTropH * 0.5;
            odY += curTropV * 0.5;
        }

        if (isODCovered) { odX += curPhorH * 0.5; odY += curPhorV * 0.5; }
        if (isOSCovered) { osX += curPhorH * 0.5; osY += curPhorV * 0.5; }

        const pPow = parseFloat(prismPower ? prismPower.value : 0) || 0;
        if (isODPrism) odX -= pPow * 0.4;
        if (isOSPrism) osX -= pPow * 0.4;

        // Optimized boundaries for realistic Vector 2D eye limits
        odX = Math.max(-28, Math.min(28, odX));
        odY = Math.max(-8, Math.min(8, odY));
        osX = Math.max(-28, Math.min(28, osX));
        osY = Math.max(-8, Math.min(8, osY));

        irisOD.style.transform = `translate(${odX}px, ${odY}px)`;
        irisOS.style.transform = `translate(${osX}px, ${osY}px)`;
    }

    [tropiaH, tropiaV, phoriaH, phoriaV, prismPower].forEach(inp => {
        if (inp) inp.addEventListener('input', updateEyeMovement);
    });

    // Test Mode Logic
    let currentPatientIdx = 0;
    let activePatientCase = { tropH: 0, tropV: 0, phorH: 0, phorV: 0 };

    const patientCases = [
        { tropH: 20, tropV: 0, phorH: 0, phorV: 0 },
        { tropH: -15, tropV: 0, phorH: 0, phorV: 0 },
        { tropH: 0, tropV: 0, phorH: 25, phorV: 0 }
    ];

    function initTestCases() {
        currentPatientIdx = 0;
        loadPatientCase(currentPatientIdx);
    }

    function loadPatientCase(idx) {
        const counter = document.getElementById('patientCounter');
        if (counter) counter.innerText = `Patient ${idx + 1} of ${patientCases.length}`;
        activePatientCase = patientCases[idx];
        updateEyeMovement();
    }

    const btnSubmitTest = document.getElementById('btnSubmitTest');
    if (btnSubmitTest) {
        btnSubmitTest.onclick = function() {
            alert("Diagnosis Submitted to Aravind Assessment Log!");
            if (currentPatientIdx < patientCases.length - 1) {
                currentPatientIdx++;
                loadPatientCase(currentPatientIdx);
            } else {
                alert("All Patient Cases Evaluated Successfully!");
                switchScreen(modeScreen);
            }
        };
    }

    // Guided Tutorial Engine
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    const tutorialText = document.getElementById('tutorialText');
    const btnTutorialNext = document.getElementById('btnTutorialNext');

    const tutorialSteps = [
        "Welcome to Aravind Simulator! Set prism diopter deviations using Tropia/Phoria inputs.",
        "Select fixing eye (OD / OS) to observe primary and secondary deviation shifts.",
        "Drag the Occluder Paddle or Prism Glass over either eye to conduct cover testing.",
        "Use the Penlight tool (🔦) for Hirschberg corneal light reflex testing."
    ];

    let currentTutorialStep = 0;

    function startTutorial() {
        currentTutorialStep = 0;
        if (tutorialOverlay) tutorialOverlay.classList.remove('hidden');
        if (tutorialText) tutorialText.innerText = tutorialSteps[0];
    }

    if (btnTutorialNext) {
        btnTutorialNext.onclick = function() {
            currentTutorialStep++;
            if (currentTutorialStep < tutorialSteps.length) {
                if (tutorialText) tutorialText.innerText = tutorialSteps[currentTutorialStep];
            } else {
                if (tutorialOverlay) tutorialOverlay.classList.add('hidden');
            }
        };
    }

});