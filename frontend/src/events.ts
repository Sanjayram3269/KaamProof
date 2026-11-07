import i18n from "./i18n";
const rows: Record<string, string[]> = {
  job_created: [
    "Job created",
    "काम बनाया गया",
    "வேலை உருவாக்கப்பட்டது",
    "ಕೆಲಸ ರಚಿಸಲಾಗಿದೆ",
  ],
  job_edited: [
    "Job details updated",
    "काम का विवरण बदला",
    "வேலை விவரங்கள் புதுப்பிக்கப்பட்டன",
    "ಕೆಲಸದ ವಿವರ ಬದಲಿಸಲಾಗಿದೆ",
  ],
  agreement_created: [
    "Agreement issued",
    "समझौता जारी हुआ",
    "ஒப்பந்தம் வெளியிடப்பட்டது",
    "ಒಪ್ಪಂದ ನೀಡಲಾಗಿದೆ",
  ],
  agreement_revised: [
    "Agreement revised",
    "समझौता बदला गया",
    "ஒப்பந்தம் திருத்தப்பட்டது",
    "ಒಪ್ಪಂದ ಪರಿಷ್ಕರಿಸಲಾಗಿದೆ",
  ],
  customer_approved: [
    "Customer approved",
    "ग्राहक ने मंज़ूर किया",
    "வாடிக்கையாளர் ஏற்றார்",
    "ಗ್ರಾಹಕರು ಅನುಮೋದಿಸಿದ್ದಾರೆ",
  ],
  customer_rejected: [
    "Customer rejected",
    "ग्राहक ने अस्वीकार किया",
    "வாடிக்கையாளர் நிராகரித்தார்",
    "ಗ್ರಾಹಕರು ತಿರಸ್ಕರಿಸಿದ್ದಾರೆ",
  ],
  work_started: [
    "Work started / resumed",
    "काम शुरू / फिर चालू हुआ",
    "வேலை தொடங்கியது / தொடர்ந்தது",
    "ಕೆಲಸ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ / ಮುಂದುವರಿಸಲಾಗಿದೆ",
  ],
  work_updated: [
    "Work update recorded",
    "काम का अपडेट दर्ज हुआ",
    "வேலைத் தகவல் பதிவு செய்யப்பட்டது",
    "ಕೆಲಸದ ನವೀಕರಣ ದಾಖಲಾಗಿದೆ",
  ],
  evidence_uploaded: [
    "Evidence uploaded",
    "सबूत अपलोड हुआ",
    "ஆதாரம் பதிவேற்றப்பட்டது",
    "ಪುರಾವೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗಿದೆ",
  ],
  evidence_removed: [
    "Evidence removed",
    "सबूत हटाया गया",
    "ஆதாரம் நீக்கப்பட்டது",
    "ಪುರಾವೆ ತೆಗೆದುಹಾಕಲಾಗಿದೆ",
  ],
  completion_submitted: [
    "Completion submitted",
    "पूर्णता की सूचना दी गई",
    "வேலை முடிவு சமர்ப்பிக்கப்பட்டது",
    "ಪೂರ್ಣತೆ ಸಲ್ಲಿಸಲಾಗಿದೆ",
  ],
  customer_acknowledged: [
    "Customer acknowledged completion",
    "ग्राहक ने पूरा काम स्वीकार किया",
    "வாடிக்கையாளர் வேலை முடிவை ஏற்றார்",
    "ಗ್ರಾಹಕರು ಪೂರ್ಣತೆ ಸ್ವೀಕರಿಸಿದ್ದಾರೆ",
  ],
  dispute_raised: [
    "Completion dispute raised",
    "पूर्णता पर विवाद दर्ज हुआ",
    "வேலை முடிவில் மறுப்பு தெரிவிக்கப்பட்டது",
    "ಪೂರ್ಣತೆಗೆ ಆಕ್ಷೇಪಣೆ ಸಲ್ಲಿಸಲಾಗಿದೆ",
  ],
  payment_recorded: [
    "Payment recorded",
    "भुगतान दर्ज हुआ",
    "பணம் பதிவு செய்யப்பட்டது",
    "ಪಾವತಿ ದಾಖಲಾಗಿದೆ",
  ],
  customer_comment: [
    "Customer comment added",
    "ग्राहक ने टिप्पणी की",
    "வாடிக்கையாளர் கருத்து சேர்க்கப்பட்டது",
    "ಗ್ರಾಹಕರ ಪ್ರತಿಕ್ರಿಯೆ ಸೇರಿಸಲಾಗಿದೆ",
  ],
  customer_link_created: [
    "Customer link created",
    "ग्राहक लिंक बनाया गया",
    "வாடிக்கையாளர் இணைப்பு உருவாக்கப்பட்டது",
    "ಗ್ರಾಹಕ ಲಿಂಕ್ ರಚಿಸಲಾಗಿದೆ",
  ],
  customer_link_revoked: [
    "Customer link revoked",
    "ग्राहक लिंक रद्द हुआ",
    "வாடிக்கையாளர் இணைப்பு ரத்தானது",
    "ಗ್ರಾಹಕ ಲಿಂಕ್ ರದ್ದಾಗಿದೆ",
  ],
  job_archived: [
    "Job archived",
    "काम संग्रहित हुआ",
    "வேலை காப்பகப்படுத்தப்பட்டது",
    "ಕೆಲಸ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ",
  ],
  job_restored: [
    "Job restored",
    "काम बहाल हुआ",
    "வேலை மீட்டமைக்கப்பட்டது",
    "ಕೆಲಸ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ",
  ],
  removeEvidence: [
    "Remove evidence",
    "सबूत हटाएँ",
    "ஆதாரத்தை நீக்கு",
    "ಪುರಾವೆ ತೆಗೆದುಹಾಕಿ",
  ],
  cash: ["Cash", "नकद", "ரொக்கம்", "ನಗದು"],
  bank: [
    "Bank transfer",
    "बैंक ट्रांसफ़र",
    "வங்கி பரிமாற்றம்",
    "ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ",
  ],
  upi: ["UPI", "यूपीआई", "UPI", "UPI"],
  card: ["Card", "कार्ड", "அட்டை", "ಕಾರ್ಡ್"],
};
["en", "hi", "ta", "kn"].forEach((language, index) =>
  i18n.addResourceBundle(
    language,
    "translation",
    Object.fromEntries(
      Object.entries(rows).map(([key, values]) => [key, values[index]]),
    ),
    true,
    true,
  ),
);
