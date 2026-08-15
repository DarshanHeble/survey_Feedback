/* ==========================================================================
   RESEARCH SURVEY & CODE CLASSIFICATION APP - LOGIC & CONTROLLER
   ========================================================================== */

// Global State
let currentStep = 1; // 1: SecA, 2: SecB, 3: SecC, 4: SecD, 5: Results
let activeSnippetIndex = 0;
const totalSnippets = 5;

// Selected benchmark snippets
let activeTaskSnippets = [];
let userResponses = {
  sectionA: {},
  sectionB: {},
  snippetAnswers: {}, // key: snippetId, val: { snip_a: 'Human'|'AI', snip_b: 'Human'|'AI', confidence: '1'..'5' }
  sectionD: {},
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initSnippets();
  renderSnippetDots();
  setupThemeToggle();
  setupStepperClick();
  setupOtherOptionToggles();
});

// Setup dynamic specify input toggles for "Other" options
function setupOtherOptionToggles() {
  const toggleBox = (checkEl, boxEl) => {
    if (!checkEl || !boxEl) return;
    if (checkEl.checked) {
      boxEl.classList.remove('hidden');
      const input = boxEl.querySelector('input');
      if (input && document.activeElement !== input) input.focus();
    } else {
      boxEl.classList.add('hidden');
    }
  };

  // Q3 Degree Other radio
  const q3Radios = document.querySelectorAll('input[name="q3_degree"]');
  const q3OtherBox = document.getElementById('q3_other_box');
  const q3OtherRadio = document.getElementById('q3_other_radio');
  q3Radios.forEach(radio => {
    ['change', 'click'].forEach(evt => {
      radio.addEventListener(evt, () => toggleBox(q3OtherRadio, q3OtherBox));
    });
  });

  // Q8 Tools Other checkbox
  const q8OtherCheck = document.getElementById('q8_other_check');
  const q8OtherBox = document.getElementById('q8_other_box');
  if (q8OtherCheck && q8OtherBox) {
    ['change', 'click'].forEach(evt => {
      q8OtherCheck.addEventListener(evt, () => toggleBox(q8OtherCheck, q8OtherBox));
    });
  }

  // Q10 Uses Other checkbox
  const q10OtherCheck = document.getElementById('q10_other_check');
  const q10OtherBox = document.getElementById('q10_other_box');
  if (q10OtherCheck && q10OtherBox) {
    ['change', 'click'].forEach(evt => {
      q10OtherCheck.addEventListener(evt, () => toggleBox(q10OtherCheck, q10OtherBox));
    });
  }

  // Q38 Factors Other checkbox
  const q38OtherCheck = document.getElementById('q38_other_check');
  const q38OtherBox = document.getElementById('q38_other_box');
  if (q38OtherCheck && q38OtherBox) {
    ['change', 'click'].forEach(evt => {
      q38OtherCheck.addEventListener(evt, () => toggleBox(q38OtherCheck, q38OtherBox));
    });
  }
}

function setupStepperClick() {
  document.querySelectorAll(".step-node").forEach((node) => {
    node.style.cursor = "pointer";
    node.onclick = () => {
      const step = parseInt(node.getAttribute("data-step"));
      if (step === 0) {
        goToSection("sectionConsent");
      } else {
        if (!userResponses.consent) {
          alert(
            "You must read and agree to the Informed Research Consent form before accessing the survey questions.",
          );
          goToSection("sectionConsent");
          return;
        }
        if (step === 1) goToSection("sectionA");
        else if (step === 2) goToSection("sectionB");
        else if (step === 3) {
          if (activeTaskSnippets.length === 0) startSnippetTasks();
          else goToSection("sectionC");
        } else if (step === 4) goToSection("sectionD");
      }
    };
  });
}

// Consent validation & proceed
function acceptConsent() {
  const agreed = document.getElementById("consentAgreeRadio");
  const declined = document.getElementById("consentDeclineRadio");

  if (!agreed || !agreed.checked) {
    if (declined && declined.checked) {
      alert(
        "You have declined to participate. Access to the survey is disabled.",
      );
    } else {
      alert(
        'Please select "I agree to participate" to unlock and fill out the survey.',
      );
    }
    return;
  }

  userResponses.consent = {
    agreed: true,
    consent_status: "Agreed & Consented",
    timestamp: new Date().toISOString(),
    statement: "Confirmed read informed consent, 18+ years of age, voluntary academic participation."
  };
  goToSection("sectionA");
}

// Setup snippets dataset
function initSnippets() {
  if (typeof SNIPPETS_DATA !== "undefined" && SNIPPETS_DATA.length > 0) {
    activeTaskSnippets = SNIPPETS_DATA.slice(0, 5);
  } else {
    console.error("SNIPPETS_DATA not loaded!");
  }
}

// Section Validation Functions
function validateSectionA() {
  saveSectionAData();
  const secA = userResponses.sectionA;
  if (!secA.full_name || !secA.college || !secA.age || !secA.gender || !secA.degree || !secA.year || !secA.experience || !secA.primary_lang) {
    alert("Please fill out all required fields in Section A (including Full Name and College Name) before proceeding.");
    return false;
  }
  return true;
}

function validateSectionB() {
  saveSectionBData();
  const secB = userResponses.sectionB;
  if (!secB.used_ai || !secB.frequency || !secB.confidence) {
    alert("Please fill out all required fields in Section B before proceeding.");
    return false;
  }
  return true;
}

function validateCurrentSnippet() {
  saveCurrentSnippetData();
  if (activeTaskSnippets.length === 0) return true;
  const currentItem = activeTaskSnippets[activeSnippetIndex];
  if (!currentItem) return true;
  const ans = userResponses.snippetAnswers[currentItem.id];
  if (!ans || !ans.userChoice) {
    alert(`Please select your code snippet answer (Snippet A, Snippet B, or Cannot Determine) for Question ${activeSnippetIndex + 1} before proceeding.`);
    return false;
  }
  if (!ans.confidence) {
    alert(`Please select your confidence rating (1-5) for Question ${activeSnippetIndex + 1} before proceeding.`);
    return false;
  }
  return true;
}

function validateSectionD() {
  saveSectionDData();
  const secD = userResponses.sectionD;
  if (!secD.overall_difficulty || !secD.ai_indistinguishable || !secD.trust_ai) {
    alert("Please answer all required questions in Section D before submitting.");
    return false;
  }
  return true;
}

// Navigation between Sections
function goToSection(sectionId) {
  // Consent Enforcement
  if (sectionId !== "sectionConsent" && !userResponses.consent) {
    alert("Please agree to the Informed Research Consent form first.");
    sectionId = "sectionConsent";
  }

  // Prevent jumping ahead if previous sections are incomplete
  if ((sectionId === "sectionB" || sectionId === "sectionC" || sectionId === "sectionD" || sectionId === "resultsDashboard") && !validateSectionA()) {
    return;
  }
  if ((sectionId === "sectionC" || sectionId === "sectionD" || sectionId === "resultsDashboard") && !validateSectionB()) {
    return;
  }
  if ((sectionId === "sectionD" || sectionId === "resultsDashboard") && !validateCurrentSnippet()) {
    return;
  }

  // Hide all sections
  document.querySelectorAll(".survey-card").forEach((card) => {
    card.classList.add("hidden-section");
    card.classList.remove("active-section");
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden-section");
    target.classList.add("active-section");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Update Stepper & Header
  if (sectionId === "sectionConsent")
    updateStepper(0, "Informed Research Consent");
  else if (sectionId === "sectionA")
    updateStepper(1, "Section A: Participant Info");
  else if (sectionId === "sectionB")
    updateStepper(2, "Section B: AI Familiarity");
  else if (sectionId === "sectionC")
    updateStepper(3, `Question ${activeSnippetIndex + 1} of 5`);
  else if (sectionId === "sectionD")
    updateStepper(4, "Section D: Perception & Feedback");
  else if (sectionId === "resultsDashboard")
    updateStepper(5, "Section E: Results & Analytics");
}

function updateStepper(stepNum, headerText) {
  currentStep = stepNum;

  // Stepper UI
  document.querySelectorAll(".step-node").forEach((node) => {
    const s = parseInt(node.getAttribute("data-step"));
    node.classList.remove("active", "completed");
    if (s === stepNum) node.classList.add("active");
    else if (s < stepNum) node.classList.add("completed");
  });

  // Header progress pill
  const pill = document.getElementById("headerProgress");
  const pillText = document.getElementById("headerProgressText");
  if (pill && pillText) {
    pill.classList.remove("hidden");
    pillText.textContent = headerText;
  }
}

// Start Snippet Tasks (Section C)
function startSnippetTasks() {
  if (!validateSectionB()) return;

  // Get user's selected language from Q6
  const selectedLang = getRadioVal("q6_lang") || "Python";

  if (typeof SNIPPETS_DATA !== "undefined") {
    activeTaskSnippets = SNIPPETS_DATA.filter(
      (s) => s.language.toLowerCase() === selectedLang.toLowerCase(),
    );
    if (activeTaskSnippets.length === 0) {
      activeTaskSnippets = SNIPPETS_DATA.slice(0, 5);
    }
  }

  renderSnippetDots();
  activeSnippetIndex = 0;
  loadSnippetQuestion(0);
  goToSection("sectionC");
}

// Load Snippet Question into UI
function loadSnippetQuestion(index) {
  if (index < 0 || index >= activeTaskSnippets.length) return;

  activeSnippetIndex = index;
  const item = activeTaskSnippets[index];

  // Update Meta Header
  document.getElementById("snippetCounterBadge").textContent =
    `Question ${index + 1} of 5`;
  document.getElementById("snippetLangTag").textContent = item.language;
  document.getElementById("snippetDiffTag").textContent = item.difficulty;
  document.getElementById("taskQuestionTitle").textContent =
    `Question ${index + 1}: ${item.language} Code Classification`;
  document.getElementById("problemStatementText").textContent =
    item.problem_statement;

  // Render Snippet Code
  const codeA = document.getElementById("snippetACode");
  const codeB = document.getElementById("snippetBCode");

  codeA.className = `language-${mapPrismLang(item.language)}`;
  codeA.textContent = item.snippet_a;

  codeB.className = `language-${mapPrismLang(item.language)}`;
  codeB.textContent = item.snippet_b;

  // Re-run Prism Syntax Highlighting
  if (window.Prism) {
    Prism.highlightElement(codeA);
    Prism.highlightElement(codeB);
  }

  // Restore previous user choices for this snippet if already selected
  const existing = userResponses.snippetAnswers[item.id];
  const form = document.getElementById("surveyForm");

  // Reset inputs
  document
    .querySelectorAll('input[name="which_human"]')
    .forEach((r) => (r.checked = false));
  document
    .querySelectorAll('input[name="current_q_confidence"]')
    .forEach((r) => (r.checked = false));

  if (existing) {
    if (existing.userChoice) {
      const radioChoice = form.querySelector(
        `input[name="which_human"][value="${existing.userChoice}"]`,
      );
      if (radioChoice) radioChoice.checked = true;
    }
    if (existing.confidence) {
      const radioConf = form.querySelector(
        `input[name="current_q_confidence"][value="${existing.confidence}"]`,
      );
      if (radioConf) radioConf.checked = true;
    }
  }

  // Pagination buttons
  const prevBtn = document.getElementById("prevSnippetBtn");
  const nextBtn = document.getElementById("nextSnippetBtn");

  if (index === 0) {
    prevBtn.innerHTML = "&larr; Back to Section B";
  } else {
    prevBtn.innerHTML = "&larr; Previous Snippet";
  }
  prevBtn.disabled = false;

  if (index === activeTaskSnippets.length - 1) {
    nextBtn.innerHTML = "Proceed to Section D &rarr;";
  } else {
    nextBtn.innerHTML = "Next Snippet &rarr;";
  }

  updateSnippetDots();
  updateStepper(3, `Snippet Task ${index + 1} of ${activeTaskSnippets.length}`);
}

function mapPrismLang(lang) {
  const l = lang.toLowerCase();
  if (l.includes("python")) return "python";
  if (l.includes("java") && !l.includes("script")) return "java";
  if (l.includes("c++") || l.includes("cpp")) return "cpp";
  if (l.includes("javascript") || l.includes("js")) return "javascript";
  if (l.includes("sql")) return "sql";
  return "clike";
}

// Save Current Snippet Choice
function saveCurrentSnippetData() {
  const item = activeTaskSnippets[activeSnippetIndex];
  const form = document.getElementById("surveyForm");

  const selectedChoice = form.querySelector(
    'input[name="which_human"]:checked',
  );
  const selectedConf = form.querySelector(
    'input[name="current_q_confidence"]:checked',
  );

  userResponses.snippetAnswers[item.id] = {
    userChoice: selectedChoice ? selectedChoice.value : null,
    confidence: selectedConf ? selectedConf.value : null,
  };
}

// Next / Previous Snippet Controls
function nextSnippet() {
  if (!validateCurrentSnippet()) return;

  if (activeSnippetIndex < activeTaskSnippets.length - 1) {
    loadSnippetQuestion(activeSnippetIndex + 1);
  } else {
    // All 5 snippets finished -> Go to Section D
    goToSection("sectionD");
  }
}

function prevSnippet() {
  saveCurrentSnippetData();
  if (activeSnippetIndex > 0) {
    loadSnippetQuestion(activeSnippetIndex - 1);
  } else {
    // If at snippet 1, back button returns to Section B
    goToSection("sectionB");
  }
}

// Snippet Dots Pagination
function renderSnippetDots() {
  const container = document.getElementById("snippetDots");
  if (!container) return;
  container.innerHTML = "";

  activeTaskSnippets.forEach((s, idx) => {
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.title = `Snippet ${idx + 1}: ${s.language}`;
    dot.onclick = () => {
      saveCurrentSnippetData();
      loadSnippetQuestion(idx);
    };
    container.appendChild(dot);
  });
}

function updateSnippetDots() {
  const dots = document.querySelectorAll("#snippetDots .dot");
  dots.forEach((dot, idx) => {
    dot.classList.remove("active", "answered");
    if (idx === activeSnippetIndex) dot.classList.add("active");

    const snipId = activeTaskSnippets[idx].id;
    if (
      userResponses.snippetAnswers[snipId] &&
      userResponses.snippetAnswers[snipId].userChoice
    ) {
      dot.classList.add("answered");
    }
  });
}

// Save Section Data Helpers
function saveSectionAData() {
  let degreeVal = getRadioVal("q3_degree");
  if (degreeVal === "Other") {
    const specify = document.querySelector('input[name="q3_degree_other_text"]');
    if (specify && specify.value.trim()) {
      degreeVal = `Other (${specify.value.trim()})`;
    }
  }

  const nameInput = document.querySelector('input[name="user_fullname"]');
  const collegeInput = document.querySelector('input[name="user_college"]');

  userResponses.sectionA = {
    full_name: nameInput ? nameInput.value.trim() : "",
    college: collegeInput ? collegeInput.value.trim() : "",
    age: getRadioVal("q1_age"),
    gender: getRadioVal("q2_gender"),
    degree: degreeVal,
    year: getRadioVal("q4_year"),
    experience: getRadioVal("q5_exp"),
    primary_lang: getRadioVal("q6_lang")
  };
}

function saveSectionBData() {
  let toolsVals = getCheckboxVals("q8_tools");
  if (toolsVals.includes("Other")) {
    const specify = document.querySelector('input[name="q8_tools_other_text"]');
    if (specify && specify.value.trim()) {
      toolsVals = toolsVals.map(t => t === "Other" ? `Other (${specify.value.trim()})` : t);
    }
  }

  let usesVals = getCheckboxVals("q10_uses");
  if (usesVals.includes("Other")) {
    const specify = document.querySelector('input[name="q10_uses_other_text"]');
    if (specify && specify.value.trim()) {
      usesVals = usesVals.map(u => u === "Other" ? `Other (${specify.value.trim()})` : u);
    }
  }

  userResponses.sectionB = {
    used_ai: getRadioVal("q7_used_ai"),
    tools: toolsVals,
    frequency: getRadioVal("q9_freq"),
    uses: usesVals,
    confidence: getRadioVal("q11_confidence")
  };
}

function saveSectionDData() {
  const commentsEl = document.querySelector('textarea[name="q41_comments"]');

  let factorsVals = getCheckboxVals("q38_factors");
  if (factorsVals.includes("Other")) {
    const specify = document.querySelector('input[name="q38_factors_other_text"]');
    if (specify && specify.value.trim()) {
      factorsVals = factorsVals.map(f => f === "Other" ? `Other (${specify.value.trim()})` : f);
    }
  }

  userResponses.sectionD = {
    overall_difficulty: getRadioVal("q37_overall_diff"),
    influential_factors: factorsVals,
    ai_indistinguishable: getRadioVal("q39_ai_indistinguishable"),
    trust_ai: getRadioVal("q40_trust_ai"),
    comments: commentsEl ? commentsEl.value : ""
  };
}

function getRadioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function getCheckboxVals(name) {
  const els = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(els).map((e) => e.value);
}

const GOOGLE_SHEETS_SPREADSHEET_ID =
  typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_SHEETS_SPREADSHEET_ID
    ? window.ENV.GOOGLE_SHEETS_SPREADSHEET_ID
    : "";

const GOOGLE_API_KEY =
  typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_API_KEY
    ? window.ENV.GOOGLE_API_KEY
    : "";

const GOOGLE_CLIENT_ID =
  typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_CLIENT_ID
    ? window.ENV.GOOGLE_CLIENT_ID
    : "";

const GOOGLE_SCRIPT_URL =
  typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_SCRIPT_URL
    ? window.ENV.GOOGLE_SCRIPT_URL
    : "";

let tokenClient = null;
let googleAccessToken = null;

// Initialize Google Identity Services token client if GOOGLE_CLIENT_ID is provided
function initGoogleAuth() {
  if (
    typeof window !== "undefined" &&
    window.google &&
    window.google.accounts &&
    GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE"
  ) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          googleAccessToken = tokenResponse.access_token;
          executeSheetsAppend(userResponses);
        }
      },
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initGoogleAuth, 1000);
});

// Helper to format values for Google Sheets API row append
function formatGoogleSheetsRow(data) {
  const consent = data.consent || {};
  const secA = data.sectionA || {};
  const secB = data.sectionB || {};
  const secD = data.sectionD || {};

  let consentText = "Agreed & Consented";
  if (typeof consent === "object" && consent.consent_status) {
    consentText = consent.consent_status;
  } else if (typeof consent === "boolean") {
    consentText = consent ? "Agreed & Consented" : "Declined";
  }

  return [
    new Date().toISOString(),
    consentText,                           // Col 2: Consent Status
    secA.full_name || '',                  // Col 3: Full Name
    secA.college || '',                    // Col 4: College / Institution Name
    secA.age || '',                        // Col 5: Age
    secA.gender || '',                     // Col 6: Gender
    secA.degree || '',                     // Col 7: Degree Program
    secA.year || '',                       // Col 8: Current Year
    secA.experience || '',                 // Col 9: Programming Experience
    secA.primary_lang || '',               // Col 10: Primary Language
    secB.used_ai || '',                    // Col 11: Used AI Tools
    Array.isArray(secB.tools) ? secB.tools.join(', ') : '',       // Col 12: AI Tools Used
    secB.frequency || '',                  // Col 13: AI Usage Frequency
    Array.isArray(secB.uses) ? secB.uses.join(', ') : '',         // Col 14: AI Purpose
    secB.confidence || '',                 // Col 15: AI Confidence
    secD.overall_difficulty || '',         // Col 16: Overall Difficulty
    Array.isArray(secD.influential_factors) ? secD.influential_factors.join(', ') : '', // Col 17: Influential Factors
    secD.ai_indistinguishable || '',       // Col 18: AI Indistinguishable Perception
    secD.trust_ai || '',                   // Col 19: Trust in AI Code
    secD.comments || '',                   // Col 20: Comments & Feedback
    JSON.stringify(data.snippetAnswers || {}), // Col 21: Snippet Answers
    JSON.stringify(data)                   // Col 22: Full Data JSON
  ];
}

function executeSheetsAppend(data) {
  if (!GOOGLE_SHEETS_SPREADSHEET_ID || GOOGLE_SHEETS_SPREADSHEET_ID === "YOUR_GOOGLE_SPREADSHEET_ID_HERE") return;

  const rowValues = formatGoogleSheetsRow(data);
  const apiEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_SPREADSHEET_ID}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED${GOOGLE_API_KEY && GOOGLE_API_KEY !== 'YOUR_GOOGLE_API_KEY_HERE' ? '&key=' + GOOGLE_API_KEY : ''}`;

  const headers = { "Content-Type": "application/json" };
  if (googleAccessToken) {
    headers["Authorization"] = `Bearer ${googleAccessToken}`;
  }

  fetch(apiEndpoint, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ values: [rowValues] })
  })
    .then(res => res.json())
    .then(result => console.log("Google Sheets API Append Result:", result))
    .catch(err => console.error("Google Sheets API Error:", err));
}

// SUBMIT SURVEY & CALCULATE BENCHMARK RESULTS
function submitSurvey() {
  saveCurrentSnippetData();
  saveSectionAData();
  saveSectionBData();
  saveSectionDData();

  if (!validateSectionA() || !validateSectionB() || !validateCurrentSnippet() || !validateSectionD()) {
    return;
  }

  // 1. Google Sheets REST API v4 Append (Primary)
  if (
    GOOGLE_SHEETS_SPREADSHEET_ID &&
    GOOGLE_SHEETS_SPREADSHEET_ID !== "YOUR_GOOGLE_SPREADSHEET_ID_HERE"
  ) {
    if (tokenClient && !googleAccessToken) {
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      executeSheetsAppend(userResponses);
    }
  } else if (
    // 2. Backup: Submit via Google Apps Script Web App Endpoint ONLY if Sheets API ID is not configured
    GOOGLE_SCRIPT_URL &&
    GOOGLE_SCRIPT_URL !== "YOUR_COPIED_WEB_APP_URL_HERE"
  ) {
    const payloadStr = JSON.stringify(userResponses);

    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: payloadStr,
    }).catch((err) => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(GOOGLE_SCRIPT_URL, payloadStr);
      }
    });
  }

  // Calculate Accuracy
  let correctCount = 0;
  let totalEvaluated = activeTaskSnippets.length;
  let confSum = 0;

  const resultsTableBody = document.getElementById("resultsTableBody");
  resultsTableBody.innerHTML = "";

  activeTaskSnippets.forEach((item, idx) => {
    const ans = userResponses.snippetAnswers[item.id] || {
      userChoice: "Unanswered",
      confidence: "3",
    };

    const userChoice = ans.userChoice || "Unanswered";
    const trueHuman = item.author_a === "Human" ? "Snippet A" : "Snippet B";
    const trueAI = item.author_a === "AI" ? "Snippet A" : "Snippet B";

    const isCorrect = userChoice === trueHuman;
    if (isCorrect) correctCount++;

    confSum += parseInt(ans.confidence || "3");

    // Add table row
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${idx + 1}</strong></td>
      <td><span class="lang-tag">${item.language}</span></td>
      <td>${item.problem_statement.substring(0, 55)}...</td>
      <td>Picked: <strong>${userChoice}</strong></td>
      <td>Human: <strong>${trueHuman}</strong> (AI: ${trueAI})</td>
      <td class="${isCorrect ? "res-correct" : "res-incorrect"}">
        ${isCorrect ? "✅ Correct" : "❌ Incorrect"}
      </td>
    `;
    resultsTableBody.appendChild(tr);
  });

  const accuracyPct = Math.round((correctCount / totalEvaluated) * 100);
  const avgConf = (confSum / activeTaskSnippets.length).toFixed(1);

  // Update Score UI
  document.getElementById("scorePercentText").textContent = `${accuracyPct}%`;
  document
    .getElementById("scoreCirclePath")
    .setAttribute("stroke-dasharray", `${accuracyPct}, 100`);
  document.getElementById("scoreHeadline").textContent =
    `Calculated Accuracy: ${correctCount} / ${totalEvaluated} Correct Decisions`;

  let rankText = "Intermediate Code Auditor";
  if (accuracyPct >= 80) rankText = "🏆 Expert AI Code Classifier";
  else if (accuracyPct >= 60) rankText = "⚡ Proficient Evaluator";
  else if (accuracyPct < 40) rankText = "🔍 Novice Code Reader";

  document.getElementById("scoreRankPill").textContent = `Rank: ${rankText}`;
  document.getElementById("scoreConfidencePill").textContent =
    `Avg Confidence: ${avgConf} / 5`;

  goToSection("resultsDashboard");
}

// Copy Code Helper
function copyCode(elementId) {
  const codeEl = document.getElementById(elementId);
  if (!codeEl) return;
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    const btn = codeEl.closest(".code-card").querySelector(".btn-copy");
    if (btn) {
      btn.textContent = "✅ Copied!";
      setTimeout(() => (btn.textContent = "📋 Copy"), 2000);
    }
  });
}

// Theme Toggle & Persistence
function setupThemeToggle() {
  const btn = document.getElementById("themeToggleBtn");
  if (!btn) return;

  // Restore saved theme on page load
  const savedTheme = localStorage.getItem("survey_app_theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }

  btn.onclick = () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("survey_app_theme", isLight ? "light" : "dark");
  };
}

// Export JSON
function exportResultsJSON() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(userResponses, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "survey_submission_data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
