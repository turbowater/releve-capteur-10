let chocs = 0;
let maxAngleX = -Infinity;
let minAngleX = Infinity;
let maxVario = -Infinity;
let minVario = Infinity;
let outOfRangeCount = 0;
let outOfRangeStartTime = null;
let outOfRangePausedTime = 0;
let isOutOfRange = false;
let lastAcc = { x: 0, y: 0, z: 0 }; // Stocke la dernière mesure d'accélération
let lastShockTime = 0;
const shockDelay = 200; // Délai de 200ms entre chaque choc

// Variables pour le baromètre
let lastAltitude = null;
let lastTimestamp = null;
const seaLevelPressure = 1013.25; // Pression au niveau de la mer en hPa

// Fonction pour convertir la pression en altitude (approximatif)
function calculateAltitude(pressure) {
    return (1 - Math.pow(pressure / seaLevelPressure, 0.190284)) * 44330.77;
}

// Variable pour la force maximale des chocs
let maxForceChoc = 0; // Force maximale des chocs enregistrée durant la session

const masseSmartphone = 0.2; // Masse approximative du smartphone en kg (ajustez selon votre cas)

// Fonction pour calculer la force en Newton
function calculateForce(accTotal) {
    return masseSmartphone * accTotal; // F = m * a
}

// Fonction pour formater la durée en hh:mm:ss
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// Gestion de l'inclinaison (angle X)
window.addEventListener('deviceorientation', (event) => {
    const angleX = event.beta; // Inclinaison autour de l'axe X (beta)
    document.getElementById('angleX').textContent = angleX.toFixed(1);

    // Mise à jour des valeurs maximales et minimales
    if (angleX > maxAngleX) maxAngleX = angleX;
    if (angleX < minAngleX) minAngleX = angleX;

    // Vérification si l'angle sort de la plage (-30° à +30°)
    if (angleX < -30 || angleX > 30) {
        if (!isOutOfRange) {
            isOutOfRange = true;
            outOfRangeCount++;
            document.getElementById('sorties-plage').textContent = outOfRangeCount;
            outOfRangeStartTime = new Date(); // Démarre le chronomètre
        }
    } else {
        if (isOutOfRange) {
            isOutOfRange = false;
            outOfRangePausedTime += new Date() - outOfRangeStartTime;
            document.getElementById('duree-hors-plage').textContent = formatDuration(outOfRangePausedTime);
        }
    }

    // Mise à jour des statistiques
    document.getElementById('angleX-max').textContent = maxAngleX.toFixed(1);
    document.getElementById('angleX-min').textContent = minAngleX.toFixed(1);
});

// Gestion du capteur de mouvement (détection des chocs)
window.addEventListener('devicemotion', (event) => {
    const acc = event.acceleration;
    const accTotal = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);


    // Variation de l'accélération
    const deltaAccX = Math.abs(acc.x - lastAcc.x);
    const deltaAccY = Math.abs(acc.y - lastAcc.y);
    const deltaAccZ = Math.abs(acc.z - lastAcc.z);

    // Condition pour détecter un choc : accélération élevée ET variation rapide
    const isShock = accTotal > 8 && (deltaAccX > 8 || deltaAccY > 8 || deltaAccZ > 8);              // sensibilité des chocs

    if (isShock && Date.now() - lastShockTime > shockDelay) {
        chocs++;
        lastShockTime = Date.now();

        // Calcul de la force du choc
        const force = calculateForce(accTotal);

        // Mettre à jour la force maximale des chocs
        if (force > maxForceChoc) {
            maxForceChoc = force;
        }

        // Mise à jour des valeurs dans le tableau
        document.getElementById('chocs').textContent = chocs;
        document.getElementById('force-chocs').textContent = maxForceChoc.toFixed(2); // Affichage de la force maximale du choc en N
    }

    // Met à jour la dernière mesure
    lastAcc = { x: acc.x, y: acc.y, z: acc.z };
});


// Gestion du baromètre (variomètre basé sur la pression)
if ('Barometer' in window) {
    const sensor = new Barometer({ frequency: 10 }); // Lecture à 10 Hz
    sensor.onreading = () => {
        const currentPressure = sensor.pressure; // Pression en hPa
        const currentTimestamp = sensor.timestamp; // Temps en ms
        const currentAltitude = calculateAltitude(currentPressure);
        
        // Afficher la pression et l'altitude sur la page
        document.getElementById('pressure').textContent = `${currentPressure.toFixed(2)} hPa`;
        document.getElementById('altitude').textContent = `${currentAltitude.toFixed(2)} m`;

        if (lastAltitude !== null && lastTimestamp !== null) {
            // Calcul de la variation d'altitude (m/s)
            const deltaTime = (currentTimestamp - lastTimestamp) / 1000; // En secondes
            const deltaAltitude = currentAltitude - lastAltitude;
            const vario = deltaAltitude / deltaTime; // Variation en m/s

            // Mise à jour des statistiques
            if (vario > maxVario) maxVario = vario;
            if (vario < minVario) minVario = vario;

            document.getElementById('vario').textContent = vario.toFixed(2);
            document.getElementById('vario-max').textContent = maxVario.toFixed(2);
            document.getElementById('vario-min').textContent = minVario.toFixed(2);
        }

        // Mise à jour des valeurs actuelles
        lastAltitude = currentAltitude;
        lastTimestamp = currentTimestamp;
    };
    sensor.onerror = (event) => {
        console.error('Erreur du capteur barométrique :', event.error);
    };
    sensor.start();
} else {
    console.warn('Baromètre non pris en charge sur cet appareil.');
    document.getElementById('vario').textContent = 'Non disponible';
}


// Réinitialisation des valeurs
document.getElementById('reset-button').addEventListener('click', () => {
    // Sauvegarder les valeurs de la session actuelle dans le tableau de session précédente
    const prevSessionBody = document.getElementById('prev-session-body');
    prevSessionBody.innerHTML = `
        <tr><td>Angle X Max</td><td>${maxAngleX.toFixed(1)}</td></tr>
        <tr><td>Angle X Min</td><td>${minAngleX.toFixed(1)}</td></tr>
        <tr><td>Sorties de Plage (-30° à +30°)</td><td>${outOfRangeCount}</td></tr>
        <tr><td>Durée Hors Plage</td><td>${formatDuration(outOfRangePausedTime)}</td></tr>
        <tr><td>Variomètre Max</td><td>${maxVario.toFixed(2)}</td></tr>
        <tr><td>Variomètre Min</td><td>${minVario.toFixed(2)}</td></tr>
        <tr><td>Nombre de Chocs</td><td>${chocs}</td></tr>
    `;

    // Réinitialisation des valeurs
    chocs = 0;
    maxAngleX = -Infinity;
    minAngleX = Infinity;
    maxVario = -Infinity;
    minVario = Infinity;
    outOfRangeCount = 0;
    outOfRangePausedTime = 0;
    isOutOfRange = false;

    // Réinitialiser le tableau de la session actuelle
    document.getElementById('chocs').textContent = '0';
    document.getElementById('angleX-max').textContent = '0';
    document.getElementById('angleX-min').textContent = '0';
    document.getElementById('sorties-plage').textContent = '0';
    document.getElementById('duree-hors-plage').textContent = '00:00:00';
    document.getElementById('vario-max').textContent = '0.00';
    document.getElementById('vario-min').textContent = '0.00';
});
