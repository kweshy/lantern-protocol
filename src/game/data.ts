export type ClueId = string;

export interface Clue {
  id: ClueId;
  title: string;
  kind: "Document" | "Physical" | "Log" | "Testimony" | "Audio";
  body: string;
}

export interface Location {
  id: string;
  name: string;
  blurb: string;
  clues: ClueId[];
  puzzle?: "cipher" | "time" | "keypad";
  locked?: "keypad";
}

export const CLUES: Record<ClueId, Clue> = {
  callLog: {
    id: "callLog",
    title: "Emergency call transcript",
    kind: "Log",
    body: "3:12 a.m. Caller: Nora Wren. \"My husband. Room Four. He's not breathing. The clock stopped, it says 3:12, I don't know why that matters, I'm sorry.\"",
  },
  badgeLog: {
    id: "badgeLog",
    title: "Security badge log (night of 13–14)",
    kind: "Log",
    body: "01:58 I.SAYER: Med Cart B\n02:20 F.MARR: Exit, courtyard\n02:28 OVERRIDE: Room 7 door released\n02:38 F.MARR: Entry, courtyard\n02:45 I.SAYER: Building exit, east\n03:05 N.WREN: Room 4\n\nNote: the server clock is NTP-synced and accurate.",
  },
  wallClock: {
    id: "wallClock",
    title: "Room 4 wall clock",
    kind: "Physical",
    body: "A battery clock, stopped at 3:12. Fresh fingerprint smudges on the bezel. The adjustment wheel on the back is still turned slightly out.",
  },
  monitor: {
    id: "monitor",
    title: "Chest sensor printout (Adrian Wren)",
    kind: "Log",
    body: "Wren wore a cardiac sensor during his own overnight study. Timestamps come from the device's internal clock, labelled \"T+\" from study start.\n\nStudy start: 22:00 (synced to server).\nArrhythmia onset: T+4:21\nFlatline: T+4:32",
  },
  syringe: {
    id: "syringe",
    title: "Insulin syringe",
    kind: "Physical",
    body: "Found in Theo Lark's closed hand when staff reached Room 4. Theo's prints only, in a grip pattern. No prints on the plunger at all, as if it was pressed through fabric.",
  },
  body: {
    id: "body",
    title: "Coroner's preliminary note",
    kind: "Document",
    body: "Hypoglycaemic arrest. Adrian Wren was not diabetic. A single injection site at the left upper arm, delivered from behind and slightly above. Minimal struggle, consistent with a sedative in his evening tea.",
  },
  cartCount: {
    id: "cartCount",
    title: "Med Cart B count sheet",
    kind: "Document",
    body: "Insulin pens: 6 expected, 5 present. Signed at 01:30 by F. Marr (count correct at that time). Felix's handwriting on the sheet, then later in red: \"NOT ME.\"",
  },
  theoFile: {
    id: "theoFile",
    title: "Patient file: Theo Lark",
    kind: "Document",
    body: "Admitted for chronic insomnia. Resident since March. Overnight program commenced the 14th of that month. Assigned Room 7. Wristband sensor logs location every 60 seconds.\n\nA sticky note in Wren's hand: \"Theo's speaker: disconnect. Immediately.\"",
  },
  tea: {
    id: "tea",
    title: "Staff kitchen",
    kind: "Physical",
    body: "Two mugs in the sink. One smells of bergamot (Earl Grey). One is chamomile with a bitter residue. Wren's name is printed on the chamomile mug.",
  },
  journal: {
    id: "journal",
    title: "Wren's journal, final page",
    kind: "Document",
    body: "Written in neat capitals, enciphered:\n\nTF V WMV NDK JAS YBWDF MLV FPCBGH BRJ",
  },
  memo: {
    id: "memo",
    title: "Lantern protocol memo",
    kind: "Document",
    body: "CONFIDENTIAL. Signed: A. Wren, I. Sayer.\n\n1. Every Lantern file is sealed with the protocol's own name.\n2. Two keys exist. I keep one; my co-signatory keeps the second.\n3. Override code for subject doors = the sum of all trial room numbers, followed by the day of the month the current subject began.\n4. Trigger phrase is played through the sleep speaker only.",
  },
  roster: {
    id: "roster",
    title: "Lantern trial roster",
    kind: "Document",
    body: "Series A rooms: 4 (calibration), 7, 9, 12.\nCurrent subject: T. Lark.\nRooms 9 and 12 were vacated last spring. Their subjects \"declined follow-up.\"",
  },
  audioFile: {
    id: "audioFile",
    title: "Room 7 sleep speaker: last played file",
    kind: "Audio",
    body: "lantern_cue_final.wav, played 02:26.\nA woman's voice, very calm: \"The lantern is lit. Walk to the light. Hold what you find.\"\nFile metadata: Author I.SAYER. Created 13th, 23:51.",
  },
  wristband: {
    id: "wristband",
    title: "Theo's wristband location log",
    kind: "Log",
    body: "02:27 Room 7\n02:29 Corridor B\n02:35 Corridor B (stationary, standing)\n02:41 Room 4\n02:43 Room 4 (stationary)",
  },
};

export const LOCATIONS: Location[] = [
  { id: "lobby", name: "Night Desk", blurb: "Fluorescent hum. A security monitor nobody watches.", clues: ["callLog", "badgeLog"] },
  { id: "room4", name: "Observation Room 4", blurb: "Where Dr. Adrian Wren was found in the patient chair.", clues: ["wallClock", "monitor", "syringe", "body"], puzzle: "time" },
  { id: "med", name: "Medication Station", blurb: "Cart B, a kitchenette, and filing cabinets.", clues: ["cartCount", "theoFile", "tea"] },
  { id: "archive", name: "Basement Archive", blurb: "Sam Okoro's domain. Boxes, dust, a single desk lamp.", clues: ["journal", "memo", "roster"], puzzle: "cipher" },
  { id: "room7", name: "Patient Room 7", blurb: "Theo's room. Sealed by an override keypad.", clues: ["audioFile", "wristband"], puzzle: "keypad", locked: "keypad" },
];

export interface InterviewOption {
  label: string;
  reply: string;
  flag?: string;
  clue?: Clue;
}
export interface Suspect {
  id: string;
  name: string;
  role: string;
  opening: string;
  options: InterviewOption[];
}

export const SUSPECTS: Suspect[] = [
  {
    id: "nora",
    name: "Nora Wren",
    role: "Wife and co-researcher",
    opening: "\"I found him. I touched his face. Ask me whatever you need to.\" Her hands keep moving even after she stops talking.",
    options: [
      { label: "Gently: tell us about the last few weeks.", flag: "noraGentle", reply: "\"He wasn't sleeping. Whatever he was carrying, he wouldn't tell me. I went to Room 4 at five past three to bring him home.\"" },
      { label: "Press her: you knew about the trials.", flag: "noraPressed", reply: "She goes still. \"Yes. I kept the ledgers. Adrian wanted to confess. Someone else wanted a career more than a conscience.\"", clue: { id: "noraLedger", title: "Nora's admission", kind: "Testimony", body: "Nora kept ledgers for the unconsented Lantern trials. Adrian planned to confess. She says she didn't hold a key; Adrian and \"the co-signatory\" did." } },
    ],
  },
  {
    id: "felix",
    name: "Felix Marr",
    role: "Night nurse",
    opening: "Felix smells of cold air and cigarettes. \"Everyone's going to look at the cart. At me.\"",
    options: [
      { label: "Where were you between 2:20 and 2:38?", reply: "\"The courtyard. The camera there works. Check it. I counted that cart at half one and it was right.\"" },
      { label: "Who else can open Cart B?", reply: "\"Any senior clinician's badge. Wren, Nora, Sayer. Not patients, obviously.\"" },
    ],
  },
  {
    id: "theo",
    name: "Theo Lark",
    role: "Resident patient",
    opening: "Theo sits on his hands. \"I saw myself in the corridor. Walking. I was watching me walk.\"",
    options: [
      { label: "Gently: what did you hear before you walked?", flag: "theoGentle", reply: "\"A woman. Close, like she was inside the pillow. And tea. That orange-perfume tea smell.\"", clue: { id: "theoVoice", title: "Theo's recollection", kind: "Testimony", body: "Before he walked, Theo heard a calm woman's voice \"inside the pillow\" and smelled bergamot." } },
      { label: "Press him: your prints are on the syringe.", flag: "theoPressed", reply: "Theo folds in on himself and won't say another word. A nurse asks you to leave." },
    ],
  },
  {
    id: "imogen",
    name: "Dr. Imogen Sayer",
    role: "Clinic director, Wren's rival",
    opening: "She is pouring Earl Grey. \"Adrian and I disagreed about a great many things. I left at quarter to three. Your clock says he died at 3:12. So.\"",
    options: [
      { label: "Did you ever co-sign Lantern documents?", reply: "\"I sign hundreds of things. I don't remember them all.\" She doesn't ask what Lantern is." },
      { label: "Why go to Cart B at 1:58?", reply: "\"Inventory check. A director's privilege.\" A pause, slightly too long." },
    ],
  },
  {
    id: "sam",
    name: "Sam Okoro",
    role: "Archivist, your guide",
    opening: "Sam has stayed up all night with you, sleeves rolled up and a pencil behind one ear. \"You're good at this. Unnervingly good.\"",
    options: [
      { label: "Ask for help with the journal.", reply: "\"Adrian sealed everything with a word, and he loved alphabet tables. Shift each letter by the key's letters, then backwards to read.\"" },
      { label: "Ask why Sam stays down here.", flag: "samTrust", reply: "Sam smiles at the boxes. \"Paper doesn't lie to you. People do.\" A glance up at you. \"Mostly.\"" },
    ],
  },
];

export const HINTS: Record<"cipher" | "time" | "keypad" | "final", string[]> = {
  cipher: ["The memo says what every Lantern file is sealed with: the protocol's own name.", "It's a Vigenère cipher keyed with LANTERN. Subtract each key letter (A=0) from the ciphertext, skipping spaces."],
  time: ["The wall clock was tampered with. The sensor counts time from the study start.", "22:00 plus 4 hours 32 minutes. Compare that to what the clock showed."],
  keypad: ["Add up every trial room number on the roster.", "4+7+9+12, then the day Theo's program began (patient file)."],
  final: ["Whose alibi only works if the death happened after 2:45?", "Who could open both Cart B and Room 7, and whose voice is on the file?"],
};

export const KILLER_OPTIONS = [
  { id: "nora", label: "Nora Wren" },
  { id: "felix", label: "Felix Marr" },
  { id: "theo", label: "Theo Lark" },
  { id: "imogen", label: "Dr. Imogen Sayer" },
];
export const METHOD_OPTIONS = [
  { id: "insulin", label: "Insulin injection" },
  { id: "sedative", label: "Sedative overdose" },
  { id: "suffocation", label: "Suffocation" },
  { id: "hypnosis", label: "Hypnotic suggestion alone" },
];
export const LIE_OPTIONS = [
  { id: "clock", label: "The wall clock time" },
  { id: "cart", label: "The cart count" },
  { id: "badge", label: "The badge log" },
  { id: "syringe", label: "Prints on the syringe" },
];
