// more documentation available at
// https://github.com/tensorflow/tfjs-models/tree/master/speech-commands

// Get elements on HTML page
const tabPractice = document.getElementById("tab-practice");
const tabTest = document.getElementById("tab-test");
const ctnPractice = document.getElementById("practice-container");
const ctnTest = document.getElementById("test-container");
const TABS = [tabPractice, tabTest];
const CTNS = [ctnPractice, ctnTest];
// gamescreen 1
const ctnGameScrn1 = document.getElementById("gamescreen1");
const btnStart = document.getElementById("btn-start");
// gamescreen 2
const ctnGameScrn2 = document.getElementById("gamescreen2");
const btnRec = document.getElementById("btn-record");
const Lights = document.getElementById("lights");
const Progress = document.getElementById("progress");
const ctnLabel = document.getElementById("label-container");
const ctnGameWord = document.getElementById("gameword-container");
// gamescreen 3
const ctnGameScrn3 = document.getElementById("gamescreen3");
const ctnResult = document.getElementById("result-container");
const btnRestart = document.getElementById("btn-tryagain");
// practice screen
const btnTry = document.getElementById("btn-try");
const LightsPractice = document.getElementById("lights-practice");
const btnTryCopy = document.getElementById("btn-try-copy");

// For navi
let tabIdx = 0;
let state = 0; // 0 = idle | 1 = game mode on
let audioName = null;
let showTTS = false; // text-to-speech

// For game play
let gameWordsPlay;
let gameWords = [
	["hin", "dizziness"],
	["ai-tor", "nausea"],
	["lau-pi-chui", "runny-nose"],
	["pi-kang", "nose"],
	["kut-tao", "bone"],
	["kut-qi", "broken-bone"],
	["tor", "vomit"],
	["huat-sio", "fever"],
	["siong-hong", "flu"],
	["orh-chey", "bruise"],
];
let gameWord, gameIdx, gameScore;

// For inference
let recognizer;
let classLabels;
let classPrediction;
let bestPrediction;
let predictions = [];
let scores;
let interval, timer;

// the link to your model provided by Teachable Machine export panel
// const URL =
const URL = "http://127.0.0.1:8008/hokkien_trnsf/";
// "https://araii.github.io/AISPR_demo/hokkien_trnsf/";

async function createModel() {
	const checkpointURL = URL + "model.json"; // model topology
	const metadataURL = URL + "metadata.json"; // model metadata

	const recognizer = speechCommands.create(
		"BROWSER_FFT", // fourier transform type, not useful to change
		undefined, // speech commands vocabulary feature, not useful for your models
		checkpointURL,
		metadataURL
	);

	// check that model and metadata are loaded via HTTPS requests.
	await recognizer.ensureModelLoaded();
	return recognizer;
}

async function init() {
	//
	for (let i = 0; i < classLabels.length; i++) {
		ctnLabel.appendChild(document.createElement("div"));
	}

	// listen() takes two arguments:
	// 1. A callback function that is invoked anytime a word is recognized.
	// 2. A configuration object with adjustable fields
	recognizer.listen(
		(result) => {
			// probability of prediction for each class
			scores = result.scores;
			// get the max value in the array
			let maxScore = Math.max(...scores);
			// get the index of the max value
			let maxIdx = scores.indexOf(maxScore);

			let bestPrediction = classLabels[maxIdx];
			predictions.push([maxScore, bestPrediction]);
			// console.log(maxScore, maxIdx, bestPrediction);
			ctnLabel.innerHTML = bestPrediction;

			// render the probability scores per class
			for (let i = 0; i < classLabels.length; i++) {
				classPrediction = classLabels[i] + ": " + scores[i].toFixed(2);
				ctnLabel.childNodes[i].innerHTML = classPrediction;
			}
		},
		{
			// in case listen should return result.spectrogram
			includeSpectrogram: false,
			probabilityThreshold: 0.75,
			invokeCallbackOnNoiseAndUnknown: true,
			// probably want between 0.5 and 0.75. More info in README
			overlapFactor: 0.75,
		}
	);

	// stop the recognition in 2secs.
	timer = setTimeout(() => {
		recognizer.stopListening();
	}, 2000);
}

//-------- Page Functions ------
function switchTab(nr) {
	// console.log( "tabIdx", tabIdx, nr );
	if (tabIdx == nr || state == 1) return;

	// clear prev tab
	if (TABS[tabIdx]) {
		TABS[tabIdx].classList.remove("is-active");
		hideElement(CTNS[tabIdx]);
		ctnLabel.innerHTML = "";
	}
	// reset game view
	hideElement(ctnGameScrn2);
	hideElement(ctnGameScrn3);
	showElement(ctnGameScrn1);

	// update tab idx
	tabIdx = nr;
	TABS[tabIdx].classList.add("is-active");
	showElement(CTNS[tabIdx]);
}

function recordingStartAni() {
	// reset...
	ctnLabel.innerHTML = "";
	predictions = [];
	// show..
	Lights.classList.add("is-active");
	LightsPractice.classList.add("is-active");
	// btnTryCopy.innerHTML = "Speak when red dot starts blinking";
	showElement(ctnLabel);
}

function recordingStopAni() {
	// hide...
	Lights.classList.remove("is-active");
	LightsPractice.classList.remove("is-active");
	// btnTryCopy.innerHTML = "Press and hold";
	ctnLabel.innerHTML = `Final prediction: ${bestPrediction}`;
	// tabulate score
	if (state == 1 && bestPrediction == gameWord[0]) gameScore++;
}

//------- Game Functions -------
function getGameWords() {
	gameWordsPlay = [...gameWords];
	gameWordsPlay = shuffle(gameWordsPlay);
	return gameWordsPlay;
}

function gameStart() {
	// reset...
	state = 1;
	gameIdx = 0;
	gameScore = 0;
	ctnLabel.innerHTML = "";
	hideElement(ctnGameScrn1);
	showElement(ctnGameScrn2);
	// prep...
	getGameWords();
	console.log("- Start Game - gameWordsPlay", gameWordsPlay);
	// start...
	runTimer();
	interval = setInterval(runTimer, 5000);
}

function runTimer() {
	if (gameIdx >= gameWordsPlay.length) {
		clearInterval(interval);
		gameEnd();
		return;
	}
	// start wordTimer
	Progress.value = 0;
	countdown(5);

	gameWord = gameWordsPlay[gameIdx];
	ctnGameWord.innerHTML = gameWord[1].toUpperCase();
	console.log("gameIdx", gameIdx, gameWord, gameWordsPlay.length);
	gameIdx++;
}

function gameEnd() {
	// set...
	state = 0;
	console.log("- End Game -", gameScore);
	// hide...
	hideElement(ctnGameScrn2);
	ctnLabel.innerHTML = "";
	// show...
	showElement(ctnGameScrn3);
	ctnResult.innerHTML = `<h5>Game Over - Your score ${gameScore} out of 10</h5>.`;
}

function runInference() {
	//
	if (recognizer.isListening()) return;
	recordingStartAni();

	recognizer.listen(
		async (result) => {
			//
			if (state == 0 && recognizer.isListening()) recognizer.stopListening();
			// probability of prediction for each class
			scores = result.scores;
			// get the max value in the array
			let maxScore = Math.max(...scores);
			// get the index of the max value
			let maxIdx = scores.indexOf(maxScore);
			bestPrediction = classLabels[maxIdx];
			// log bestPredictions into array
			predictions.push([maxScore, bestPrediction]);
			console.log(maxScore, maxIdx, bestPrediction);
			// show text-to-speech if true
			if (showTTS) ctnLabel.innerHTML = bestPrediction;
		},
		{
			includeSpectrogram: false,
			probabilityThreshold: 0.9, // 0.75
			invokeCallbackOnNoiseAndUnknown: true,
			// probably want between 0.5 and 0.75. More info in README
			overlapFactor: 0.999, // 0.89
		}
	);
}

//------- Button Functions -------
btnRec.ontouchstart = btnRec.onmousedown = function (e) {
	e.preventDefault();
	console.log("btnRec - press");
	runInference();
};

btnRec.ontouchend = btnRec.onmouseup = function (e) {
	e.preventDefault();
	// add slight delay before stopping ??
	// timer = setTimeout(() => {}, 500);
	if (recognizer.isListening()) {
		recognizer.stopListening();
	}
	console.log("btnRec - stop");
	recordingStopAni();
};

btnTry.ontouchstart = btnTry.onmousedown = function (e) {
	e.preventDefault();
	state = 1;
	showTTS = true;
	console.log("btnTry - press");
	runInference();
};

btnTry.ontouchend = btnTry.onmouseup = function (e) {
	e.preventDefault();
	console.log(recognizer.isListening());
	if (recognizer.isListening() || state == 1) {
		recognizer.stopListening();
		state = 0; // will stop recognizer
		showTTS = false;
	}
	console.log("btnTry - stop");
	recordingStopAni();
};

btnStart.onclick = function (e) {
	e.preventDefault();
	gameStart();
};

btnRestart.onclick = function (e) {
	e.preventDefault();
	// hide...
	hideElement(ctnGameScrn3);
	showElement(ctnGameScrn1);
};

//------ Helpers Function ------
function countdown(seconds) {
	// console.log("countdown");
	for (let i = 0; i < seconds; i++) {
		setTimeout(() => {
			Progress.value += Math.floor(100 / seconds);
			// console.log(`i: ${i}`);
		}, 1000 * i);
	}
}

function hideElement(ele) {
	ele.style.display = "none";
}

function showElement(ele) {
	ele.style.display = "revert";
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
	let currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle.
	while (currentIndex > 0) {
		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}
	return array;
}

function playAudio(name) {
	if (audioName !== null && audioName.playing()) return;
	audioName = new Howl({
		src: [`./audio/hokkien/${name}.wav`],
		html5: true,
		loop: false,
		volume: 0.5,
	});
	audioName.play();
}

// ----- base -------
async function app() {
	recognizer = await createModel();
	classLabels = recognizer.wordLabels(); // get class labels

	console.log("Page load...classLabels", classLabels);
	switchTab(0);
}

app();
