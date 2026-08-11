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
        
        // Tool Drag Positions & Overlay Detection
        occluderOverOD: false,
        occluderOverOS: false,
        prismOverOD: false,
        prismOverOS: false,
        
        tutorialStep: 0
    };

    // ================= DOM ELEMENTS =================
    const startScreen = document.getElementById('startScreen');
    const modeScreen = document.getElementById('modeScreen');
    const simulatorScreen = document.getElementById('simulatorScreen');

    const btnStartApp = document.getElementById('btnStartApp');
    const btnChooseExplore = document.getElementById('btnChooseExplore');
    const btnChooseTest = document.getElementById('btnChooseTest');
    const btnHome = document.getElementById('btnHome');
    const btnHelp = document.getElementById('btnHelp');
    const modeIndicatorLabel = document.getElementById('modeIndicatorLabel');

    const socketOD = document.getElementById('socketOD');
    const socketOS = document.getElementById('socketOS');
    const irisOD = document.getElementById('irisOD');
    const irisOS = document.getElementById('irisOS');
    const reflexOD = document.getElementById('reflexOD');
    const reflexOS = document.getElementById('reflexOS');

    const canvas = document.getElementById('canvas');
    const fixationTarget = document.getElementById('fixationTarget');
    const occluderPaddle = document.getElementById('occluderPaddle');
    const prismGlass = document.getElementById('prismGlass');

    const btnOD = document.getElementById('btnOD');
    const exploreControls = document.getElementById('exploreControls');
    const inputTropiaH = document.getElementById('tropiaH');
    const inputTropiaV = document.getElementById('tropiaV');
    const inputPhoriaH = document.getElementById('phoriaH');
    const inputPhoriaV = document.getElementById('phoriaV');

    const btnPenlight = document.getElementById('btnPenlight');
    const btnLinkTools = document.getElementById('btnLinkTools');
    const inputPrismPower = document.getElementById('prismPower');
    const btnRotatePrism = document.getElementById('btnRotatePrism');

    const testControls = document.getElementById('testControls');
    const ansLeftMag = document.getElementById('ansLeftMag');
    const ansLeftEye = document.getElementById('ansLeftEye');
    const ansLeftCond = document.getElementById('ansLeftCond');
    
    const ansRightMag = document.getElementById('ansRightMag');
    const ansRightEye = document.getElementById('ansRightEye');
    const ansRightCond = document.getElementById('ansRightCond');

    const btnSubmitTest = document.getElementById('btnSubmitTest');
    const patientCounter = document.getElementById('patientCounter');

    const btnShowAckModal = document.getElementById('btnShowAckModal');
    const instructionModal = document.getElementById('instructionModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnStartSimulatorFromModal = document.getElementById('btnStartSimulatorFromModal');

    // ================= NAVIGATION =================
    btnStartApp.addEventListener('click', () => switchScreen(modeScreen));

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

    btnHome.addEventListener('click', () => switchScreen(modeScreen));
    btnHelp.addEventListener('click', () => instructionModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => instructionModal.classList.add('hidden'));

    if (btnShowAckModal) {
        btnShowAckModal.addEventListener('click', () => instructionModal.classList.remove('hidden'));
    }

    btnStartSimulatorFromModal.addEventListener('click', () => {
        instructionModal.classList.add('hidden');
        if (!simulatorScreen.classList.contains('active')) switchScreen(modeScreen);
    });

    function switchScreen(targetScreen) {
        [startScreen, modeScreen, simulatorScreen].forEach(scr => scr.classList.remove('active'));
        targetScreen.classList.add('active');
    }

    // ================= ACCURATE DRAG & BOUNDARY ENGINE =================
    makeDraggableFixed(fixationTarget);
    makeDraggableFixed(occluderPaddle);
    makeDraggableFixed(prismGlass);

    function makeDraggableFixed(element) {
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

            // Canvas Boundary Lock (பாக்ஸுக்குள்ளேயே மட்டும்)
            const bounds = canvas.getBoundingClientRect();
            const maxTop = bounds.height - el.offsetHeight;
            const maxLeft = bounds.width - el.offsetWidth;

            newTop = Math.max(0, Math.min(newTop, maxTop));
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));

            el.style.top = newTop + "px";
            el.style.left = newLeft + "px";

            // Linked Tools Logic
            if (state.linkedTools && el === occluderPaddle) {
                let prismLeft = newLeft + 70;
                const prismMaxLeft = bounds.width - prismGlass.offsetWidth;
                prismGlass.style.top = newTop + "px";
                prismGlass.style.left = Math.min(prismLeft, prismMaxLeft) + "px";
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

    // ================= TOOL DETECTION & OVERLAY =================
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

    // ================= EXACT CLINICAL EYE MOVEMENT =================
    function calculateEyeOffset(socketEl, targetRect) {
        const socketRect = socketEl.getBoundingClientRect();
        
        const eyeCenterX = socketRect.left + socketRect.width / 2;
        const eyeCenterY = socketRect.top + socketRect.height / 2;

        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        const deltaX = targetCenterX - eyeCenterX;
        const deltaY = targetCenterY - eyeCenterY;

        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.hypot(deltaX, deltaY);

        const maxRadius = 30; 
        const movementMagnitude = Math.min(distance * 0.08, maxRadius);

        const shiftX = Math.cos(angle) * movementMagnitude;
        const shiftY = Math.sin(angle) * movementMagnitude;

        return { shiftX, shiftY, eyeCenterX, eyeCenterY };
    }

    function updateEyePositions() {
        const targetRect = fixationTarget.getBoundingClientRect();

        let posOD = calculateEyeOffset(socketOD, targetRect);
        let posOS = calculateEyeOffset(socketOS, targetRect);

        // Convergence Adjustment
        const midEyeX = (posOD.eyeCenterX + posOS.eyeCenterX) / 2;
        const midEyeY = (posOD.eyeCenterY + posOS.eyeCenterY) / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        const distToCenter = Math.hypot(targetCenterX - midEyeX, targetCenterY - midEyeY);

        if (distToCenter < 250) {
            const convergenceFactor = (250 - distToCenter) * 0.04;
            posOD.shiftX += convergenceFactor;
            posOS.shiftX -= convergenceFactor;
        }

        // Strabismus Offsets
        let tH = state.tropiaH * 0.4;
        let tV = state.tropiaV * 0.4;
        let pH = state.phoriaH * 0.4;
        let pV = state.phoriaV * 0.4;

        let prismPowerEffect = state.prismPower * 0.3;
        let prismX = 0, prismY = 0;

        if (state.prismBase === 'BI') prismX = -prismPowerEffect;
        if (state.prismBase === 'BO') prismX = prismPowerEffect;
        if (state.prismBase === 'BU') prismY = -prismPowerEffect;
        if (state.prismBase === 'BD') prismY = prismPowerEffect;

        // OD Logic (Right Eye)
        if (state.occluderOverOD) {
            posOD.shiftX += pH + tH;
            posOD.shiftY += pV + tV;
        } else if (state.occluderOverOS || state.fixingEye === 'OS') {
            posOD.shiftX += tH;
            posOD.shiftY += tV;
        }

        if (state.prismOverOD) {
            posOD.shiftX += prismX;
            posOD.shiftY += prismY;
        }

        // OS Logic (Left Eye)
        if (state.occluderOverOS) {
            posOS.shiftX += pH + tH;
            posOS.shiftY += pV + tV;
        } else if (state.occluderOverOD || state.fixingEye === 'OD') {
            posOS.shiftX += tH;
            posOS.shiftY += tV;
        }

        if (state.prismOverOS) {
            posOS.shiftX += prismX;
            posOS.shiftY += prismY;
        }

        irisOD.style.transform = `translate(${posOD.shiftX}px, ${posOD.shiftY}px)`;
        irisOS.style.transform = `translate(${posOS.shiftX}px, ${posOS.shiftY}px)`;
    }

    // ================= CONTROLS & LISTENERS =================
    btnOD.addEventListener('click', () => {
        state.fixingEye = state.fixingEye === 'OD' ? 'OS' : 'OD';
        btnOD.textContent = `Fixing Eye: ${state.fixingEye}`;
        updateEyePositions();
    });

    [inputTropiaH, inputTropiaV, inputPhoriaH, inputPhoriaV].forEach(input => {
        if(input) {
            input.addEventListener('input', () => {
                state.tropiaH = parseFloat(inputTropiaH.value) || 0;
                state.tropiaV = parseFloat(inputTropiaV.value) || 0;
                state.phoriaH = parseFloat(inputPhoriaH.value) || 0;
                state.phoriaV = parseFloat(inputPhoriaV.value) || 0;
                updateEyePositions();
            });
        }
    });

    btnPenlight.addEventListener('click', () => {
        state.penlightActive = !state.penlightActive;
        btnPenlight.classList.toggle('active', state.penlightActive);
        reflexOD.classList.toggle('hidden', !state.penlightActive);
        reflexOS.classList.toggle('hidden', !state.penlightActive);
    });

    btnLinkTools.addEventListener('click', () => {
        state.linkedTools = !state.linkedTools;
        btnLinkTools.classList.toggle('active', state.linkedTools);
    });

    inputPrismPower.addEventListener('input', () => {
        state.prismPower = parseFloat(inputPrismPower.value) || 0;
        updateEyePositions();
    });

    const bases = ['BI', 'BO', 'BU', 'BD'];
    btnRotatePrism.addEventListener('click', () => {
        let currentIndex = bases.indexOf(state.prismBase);
        state.prismBase = bases[(currentIndex + 1) % bases.length];
        btnRotatePrism.textContent = `🔄 ${state.prismBase}`;
        updateEyePositions();
    });

    // ================= TEST MODE =================
    function setupTestCases() {
        state.patients = [
            { id: 1, tropiaH: 20, tropiaV: 0, phoriaH: 0, phoriaV: 0, affectedEye: 'Left', cond: 'Exotropia' },
            { id: 2, tropiaH: -15, tropiaV: 0, phoriaH: 0, phoriaV: 0, affectedEye: 'Right', cond: 'Esotropia' },
            { id: 3, tropiaH: 0, tropiaV: 0, phoriaH: -25, phoriaV: 0, affectedEye: 'Left', cond: 'Esophoria' }
        ];
        state.currentPatientIndex = 0;
        loadPatientCase();
    }

    function loadPatientCase() {
        const p = state.patients[state.currentPatientIndex];
        patientCounter.textContent = `${state.currentPatientIndex + 1} of ${state.patients.length}`;
        state.tropiaH = p.tropiaH;
        state.tropiaV = p.tropiaV;
        state.phoriaH = p.phoriaH;
        state.phoriaV = p.phoriaV;

        if (ansLeftMag) ansLeftMag.value = 0;
        if (ansLeftCond) ansLeftCond.value = 'None';
        if (ansRightMag) ansRightMag.value = 0;
        if (ansRightCond) ansRightCond.value = 'None';

        updateEyePositions();
    }

    btnSubmitTest.addEventListener('click', () => {
        const p = state.patients[state.currentPatientIndex];
        const expectedMag = Math.abs(p.tropiaH || p.phoriaH);

        let userMag = 0, userCond = 'None';

        if (p.affectedEye === 'Left') {
            userMag = parseFloat(ansLeftMag.value) || 0;
            userCond = ansLeftCond.value;
        } else if (p.affectedEye === 'Right') {
            userMag = parseFloat(ansRightMag.value) || 0;
            userCond = ansRightCond.value;
        }

        if (Math.abs(userMag - expectedMag) <= 3 && userCond === p.cond) {
            alert("✓ Correct Diagnosis!");
            if (state.currentPatientIndex < state.patients.length - 1) {
                state.currentPatientIndex++;
                loadPatientCase();
            } else {
                alert("🎉 Assessment completed successfully!");
                switchScreen(modeScreen);
            }
        } else {
            alert("❌ Incorrect Diagnosis. Re-examine using Cover-Uncover test.");
        }
    });

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
