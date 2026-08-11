document.addEventListener('DOMContentLoaded', () => {

    // ================= STATE MANAGEMENT =================
    const state = {
        mode: 'explore', // 'explore' or 'test'
        fixingEye: 'OD',  // 'OD' (Right) or 'OS' (Left)
        tropiaH: 0,
        tropiaV: 0,
        phoriaH: 0,
        phoriaV: 0,
        penlightActive: false,
        linkedTools: false,
        prismPower: 20,
        prismBase: 'BI', // 'BI', 'BO', 'BU', 'BD'
        
        // Test Mode States
        currentPatientIndex: 0,
        patients: [],
        
        // Tool Drag Positions & Positions relative to eyes
        occluderOverOD: false,
        occluderOverOS: false,
        prismOverOD: false,
        prismOverOS: false,
        
        // Tutorial State
        tutorialStep: 0
    };

    // ================= DOM ELEMENTS =================
    // Screens
    const startScreen = document.getElementById('startScreen');
    const modeScreen = document.getElementById('modeScreen');
    const simulatorScreen = document.getElementById('simulatorScreen');

    // Buttons Navigation
    const btnStartApp = document.getElementById('btnStartApp');
    const btnChooseExplore = document.getElementById('btnChooseExplore');
    const btnChooseTest = document.getElementById('btnChooseTest');
    const btnHome = document.getElementById('btnHome');
    const btnHelp = document.getElementById('btnHelp');
    const modeIndicatorLabel = document.getElementById('modeIndicatorLabel');

    // Eyes Elements
    const socketOD = document.getElementById('socketOD');
    const socketOS = document.getElementById('socketOS');
    const irisOD = document.getElementById('irisOD');
    const irisOS = document.getElementById('irisOS');
    const reflexOD = document.getElementById('reflexOD');
    const reflexOS = document.getElementById('reflexOS');

    // Draggable Tools
    const canvas = document.getElementById('canvas');
    const fixationTarget = document.getElementById('fixationTarget');
    const occluderPaddle = document.getElementById('occluderPaddle');
    const prismGlass = document.getElementById('prismGlass');

    // Explore Controls
    const btnOD = document.getElementById('btnOD');
    const exploreControls = document.getElementById('exploreControls');
    const inputTropiaH = document.getElementById('tropiaH');
    const inputTropiaV = document.getElementById('tropiaV');
    const inputPhoriaH = document.getElementById('phoriaH');
    const inputPhoriaV = document.getElementById('phoriaV');

    // Action Controls
    const btnPenlight = document.getElementById('btnPenlight');
    const btnLinkTools = document.getElementById('btnLinkTools');
    const inputPrismPower = document.getElementById('prismPower');
    const btnRotatePrism = document.getElementById('btnRotatePrism');

    // Test Mode Controls
    const testControls = document.getElementById('testControls');
    const ansPrimaryMag = document.getElementById('ansPrimaryMag');
    const ansPrimaryEye = document.getElementById('ansPrimaryEye');
    const ansPrimaryCond = document.getElementById('ansPrimaryCond');
    const btnSubmitTest = document.getElementById('btnSubmitTest');
    const patientCounter = document.getElementById('patientCounter');

    // Modals & Tutorials
    const btnShowAckModal = document.getElementById('btnShowAckModal');
    const instructionModal = document.getElementById('instructionModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnStartSimulatorFromModal = document.getElementById('btnStartSimulatorFromModal');

    // ================= INITIALIZATION & NAVIGATION =================
    btnStartApp.addEventListener('click', () => {
        switchScreen(modeScreen);
    });

    btnChooseExplore.addEventListener('click', () => {
        state.mode = 'explore';
        modeIndicatorLabel.textContent = 'Clinical Exploration';
        exploreControls.classList.remove('hidden');
        testControls.classList.add('hidden');
        switchScreen(simulatorScreen);
        resetSimulation();
    });

    btnChooseTest.addEventListener('click', () => {
        state.mode = 'test';
        modeIndicatorLabel.textContent = 'Patient Assessment (Test)';
        exploreControls.classList.add('hidden');
        testControls.classList.remove('hidden');
        setupTestCases();
        switchScreen(simulatorScreen);
        resetSimulation();
    });

    btnHome.addEventListener('click', () => {
        switchScreen(modeScreen);
    });

    btnHelp.addEventListener('click', () => {
        instructionModal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
        instructionModal.classList.add('hidden');
    });

    if (btnShowAckModal) {
        btnShowAckModal.addEventListener('click', () => {
            instructionModal.classList.remove('hidden');
        });
    }

    btnStartSimulatorFromModal.addEventListener('click', () => {
        instructionModal.classList.add('hidden');
        if (simulatorScreen.classList.contains('active')) return;
        switchScreen(modeScreen);
    });

    function switchScreen(targetScreen) {
        [startScreen, modeScreen, simulatorScreen].forEach(scr => scr.classList.remove('active'));
        targetScreen.classList.add('active');
    }

    // ================= DRAG AND DROP ENGINE =================
    makeDraggable(fixationTarget);
    makeDraggable(occluderPaddle);
    makeDraggable(prismGlass);

    function makeDraggable(element) {
        let posX = 0, posY = 0, mouseX = 0, mouseY = 0;

        element.onmousedown = dragMouseDown;
        element.ontouchstart = dragTouchStart;

        function dragMouseDown(e) {
            e.preventDefault();
            mouseX = e.clientX;
            mouseY = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e) {
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementTouchMove;
        }

        function elementDrag(e) {
            e.preventDefault();
            posX = mouseX - e.clientX;
            posY = mouseY - e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;

            moveElement(element, posX, posY);
        }

        function elementTouchMove(e) {
            const touch = e.touches[0];
            posX = mouseX - touch.clientX;
            posY = mouseY - touch.clientY;
            mouseX = touch.clientX;
            mouseY = touch.clientY;

            moveElement(element, posX, posY);
        }

        function moveElement(el, dx, dy) {
            let newTop = el.offsetTop - dy;
            let newLeft = el.offsetLeft - dx;

            // Canvas boundary limits
            const bounds = canvas.getBoundingClientRect();
            newTop = Math.max(10, Math.min(newTop, bounds.height - el.offsetHeight - 10));
            newLeft = Math.max(10, Math.min(newLeft, bounds.width - el.offsetWidth - 10));

            el.style.top = newTop + "px";
            el.style.left = newLeft + "px";

            // If Link Tools is active, move Prism along with Occluder
            if (state.linkedTools && el === occluderPaddle) {
                prismGlass.style.top = newTop + "px";
                prismGlass.style.left = (newLeft + 70) + "px";
            }

            checkToolOverlay();
            updateEyePositions();
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    // ================= TOOL DETECTION (OVERLAYING EYES) =================
    function checkToolOverlay() {
        const rectOD = socketOD.getBoundingClientRect();
        const rectOS = socketOS.getBoundingClientRect();
        const rectOcc = occluderPaddle.getBoundingClientRect();
        const rectPrism = prismGlass.getBoundingClientRect();

        state.occluderOverOD = isOverlapping(rectOcc, rectOD);
        state.occluderOverOS = isOverlapping(rectOcc, rectOS);
        state.prismOverOD = isOverlapping(rectPrism, rectOD);
        state.prismOverOS = isOverlapping(rectPrism, rectOS);
    }

    function isOverlapping(r1, r2) {
        return !(r1.right < r2.left || 
                 r1.left > r2.right || 
                 r1.bottom < r2.top || 
                 r1.top > r2.bottom);
    }

    // ================= ORIGINAL SMOOTH EYE TRACKING =================
function calculateEyeOffset(socketEl, targetRect) {
    const socketRect = socketEl.getBoundingClientRect();
    
    // Center position of socket
    const eyeCenterX = socketRect.left + socketRect.width / 2;
    const eyeCenterY = socketRect.top + socketRect.height / 2;

    // Center position of fixation target
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Distance Vector
    const deltaX = targetCenterX - eyeCenterX;
    const deltaY = targetCenterY - eyeCenterY;

    // Angle and distance calculation
    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.hypot(deltaX, deltaY);

    // Dynamic orbital movement range
    const maxRadius = 32; 
    const movementMagnitude = Math.min(distance * 0.1, maxRadius);

    const shiftX = Math.cos(angle) * movementMagnitude;
    const shiftY = Math.sin(angle) * movementMagnitude;

    return { shiftX, shiftY, eyeCenterX, eyeCenterY };
}

function updateEyePositions() {
    const targetRect = fixationTarget.getBoundingClientRect();

    let posOD = calculateEyeOffset(socketOD, targetRect);
    let posOS = calculateEyeOffset(socketOS, targetRect);

    // Natural Convergence (Target மூக்கின் அருகில் வரும்போது)
    const midEyeX = (posOD.eyeCenterX + posOS.eyeCenterX) / 2;
    const midEyeY = (posOD.eyeCenterY + posOS.eyeCenterY) / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const distToCenter = Math.hypot(targetCenterX - midEyeX, targetCenterY - midEyeY);

    if (distToCenter < 250) {
        const convergenceFactor = (250 - distToCenter) * 0.05;
        posOD.shiftX += convergenceFactor; // Right Eye moves Inward
        posOS.shiftX -= convergenceFactor; // Left Eye moves Inward
    }

    // Apply Strabismus deviations (Tropia & Phoria)
    let tH = state.tropiaH * 0.4;
    let tV = state.tropiaV * 0.4;
    let pH = state.phoriaH * 0.4;
    let pV = state.phoriaV * 0.4;

    // Prism Neutralization Logic
    let prismPowerEffect = state.prismPower * 0.3;
    let prismX = 0, prismY = 0;

    if (state.prismBase === 'BI') prismX = -prismPowerEffect;
    if (state.prismBase === 'BO') prismX = prismPowerEffect;
    if (state.prismBase === 'BU') prismY = -prismPowerEffect;
    if (state.prismBase === 'BD') prismY = prismPowerEffect;

    // OD (Right Eye) Logic
    if (state.occluderOverOD) {
        posOD.shiftX += pH + tH;
        posOD.shiftY += pV + tV;
    } else if (!state.occluderOverOS && state.fixingEye === 'OS') {
        posOD.shiftX += tH;
        posOD.shiftY += tV;
    }

    if (state.prismOverOD) {
        posOD.shiftX += prismX;
        posOD.shiftY += prismY;
    }

    // OS (Left Eye) Logic
    if (state.occluderOverOS) {
        posOS.shiftX += pH + tH;
        posOS.shiftY += pV + tV;
    } else if (!state.occluderOverOD && state.fixingEye === 'OD') {
        posOS.shiftX += tH;
        posOS.shiftY += tV;
    }

    if (state.prismOverOS) {
        posOS.shiftX += prismX;
        posOS.shiftY += prismY;
    }

    // Original Clean 2D Translation (No Rotate / No Scale)
    irisOD.style.transform = `translate(${posOD.shiftX}px, ${posOD.shiftY}px)`;
    irisOS.style.transform = `translate(${posOS.shiftX}px, ${posOS.shiftY}px)`;
}

    // ================= EVENT LISTENERS FOR CONTROLS =================
    btnOD.addEventListener('click', () => {
        state.fixingEye = state.fixingEye === 'OD' ? 'OS' : 'OD';
        btnOD.textContent = `Fixing Eye: ${state.fixingEye}`;
        updateEyePositions();
    });

    // Inputs for Explore Mode
    [inputTropiaH, inputTropiaV, inputPhoriaH, inputPhoriaV].forEach(input => {
        input.addEventListener('input', () => {
            state.tropiaH = parseFloat(inputTropiaH.value) || 0;
            state.tropiaV = parseFloat(inputTropiaV.value) || 0;
            state.phoriaH = parseFloat(inputPhoriaH.value) || 0;
            state.phoriaV = parseFloat(inputPhoriaV.value) || 0;
            updateEyePositions();
        });
    });

    // Penlight Toggle
    btnPenlight.addEventListener('click', () => {
        state.penlightActive = !state.penlightActive;
        btnPenlight.classList.toggle('active', state.penlightActive);
        reflexOD.classList.toggle('hidden', !state.penlightActive);
        reflexOS.classList.toggle('hidden', !state.penlightActive);
    });

    // Link Tools Toggle
    btnLinkTools.addEventListener('click', () => {
        state.linkedTools = !state.linkedTools;
        btnLinkTools.classList.toggle('active', state.linkedTools);
    });

    // Prism Controls
    inputPrismPower.addEventListener('input', () => {
        state.prismPower = parseFloat(inputPrismPower.value) || 0;
        updateEyePositions();
    });

    const bases = ['BI', 'BO', 'BU', 'BD'];
    btnRotatePrism.addEventListener('click', () => {
        let currentIndex = bases.indexOf(state.prismBase);
        state.prismBase = bases[(currentIndex + 1) % bases.length];
        btnRotatePrism.textContent = `🔄 ${state.prismBase}`;
        btnRotatePrism.title = `Base: ${state.prismBase}`;
        updateEyePositions();
    });

    // ================= PATIENT TEST MODE LOGIC =================
    function setupTestCases() {
        state.patients = [
            { id: 1, tropiaH: 20, tropiaV: 0, phoriaH: 0, phoriaV: 0, eye: 'Left', cond: 'Exotropia' },
            { id: 2, tropiaH: -15, tropiaV: 0, phoriaH: 0, phoriaV: 0, eye: 'Right', cond: 'Esotropia' },
            { id: 3, tropiaH: 0, tropiaV: 0, phoriaH: -25, phoriaV: 0, eye: 'Left', cond: 'Esophoria' }
        ];
        state.currentPatientIndex = 0;
        loadPatientCase();
    }

    function loadPatientCase() {
        const p = state.patients[state.currentPatientIndex];
        patientCounter.textContent = `Patient ${state.currentPatientIndex + 1}/${state.patients.length}`;
        state.tropiaH = p.tropiaH;
        state.tropiaV = p.tropiaV;
        state.phoriaH = p.phoriaH;
        state.phoriaV = p.phoriaV;
        updateEyePositions();
    }

    btnSubmitTest.addEventListener('click', () => {
        const userMag = parseFloat(ansPrimaryMag.value) || 0;
        const userEye = ansPrimaryEye.value;
        const userCond = ansPrimaryCond.value;

        const p = state.patients[state.currentPatientIndex];
        const expectedMag = Math.abs(p.tropiaH || p.phoriaH);

        if (Math.abs(userMag - expectedMag) <= 3 && userCond === p.cond) {
            alert("✓ Correct Diagnosis! Great Clinical Judgement.");
            if (state.currentPatientIndex < state.patients.length - 1) {
                state.currentPatientIndex++;
                loadPatientCase();
            } else {
                alert("🎉 Congratulations! You have completed all Aravind Patient Assessment cases.");
                switchScreen(modeScreen);
            }
        } else {
            alert("❌ Incorrect Diagnosis. Re-examine using Cover-Uncover & Prism tests.");
        }
    });

    // ================= HELPER RESET FUNCTION =================
    function resetSimulation() {
        fixationTarget.style.top = "20px";
        fixationTarget.style.left = "20px";
        occluderPaddle.style.top = "20px";
        occluderPaddle.style.left = "90px";
        prismGlass.style.top = "20px";
        prismGlass.style.left = "180px";

        if (state.mode === 'explore') {
            inputTropiaH.value = 0;
            inputTropiaV.value = 0;
            inputPhoriaH.value = 0;
            inputPhoriaV.value = 0;
            state.tropiaH = 0;
            state.tropiaV = 0;
            state.phoriaH = 0;
            state.phoriaV = 0;
        }

        updateEyePositions();
    }

});
