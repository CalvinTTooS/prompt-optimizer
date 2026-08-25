// Sincronizza i file di metodo di questo repo (canonico) verso un fork.
//
// Sorgente: questo repo. Destinazione: il fork passato come argomento o chiesto
// interattivamente (percorso assoluto, oppure solo il nome della sottocartella
// di C:\GitHubRepo\Projects, es. "prompt optimizer pro").
//
// - Copia secca: AGENTS.md, docs/METHOD.md, app/scaffold-template/*.md, profiles/*.md
// - CLAUDE.md di root: splice sicuro — sostituisce solo la parte SOPRA il
//   marcatore "## Contesto del progetto", preserva tutto da lì in giù (specifico
//   del fork). Se il marcatore manca in uno dei due file, salta e avvisa.
// - Esegue "npm run generate:scaffold" nel fork (necessario: ha toccato
//   app/scaffold-template/, sorgente del file generato scaffoldTemplate.ts).
// - NON committa e NON lancia lint/test: stampa solo il promemoria finale.
//
// Run: node scripts/sync-standards.mjs ["<path o nome fork>"] [-y]

import { existsSync, statSync, copyFileSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // radice repo canonico
const PROJECTS_ROOT = dirname(SRC);                                  // es. C:\GitHubRepo\Projects
const MARKER = '## Contesto del progetto';

// File a copia secca: [percorso relativo] — sovrascritti nel fork.
const COPY_FILES = [
  'AGENTS.md',
  'docs/METHOD.md',
  'app/scaffold-template/METHOD.md',
  'app/scaffold-template/CLAUDE.md',
  'app/scaffold-template/GEMINI.md',
];
const PROFILES_DIR = 'app/scaffold-template/profiles';

function fail(msg) {
  console.error(`\n  ERRORE: ${msg}\n`);
  process.exit(1);
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()); }));
}

// Risolve l'input in un percorso di fork: assoluto/relativo se esiste, altrimenti
// come sottocartella di PROJECTS_ROOT.
function resolveFork(input) {
  const direct = resolve(input);
  if (existsSync(direct) && statSync(direct).isDirectory()) return direct;
  const sibling = join(PROJECTS_ROOT, input);
  if (existsSync(sibling) && statSync(sibling).isDirectory()) return sibling;
  return direct; // ritorna comunque per un messaggio di errore chiaro
}

// Splice sicuro di CLAUDE.md: preambolo canonico + coda del fork dal marcatore.
// Preserva i byte di ciascun lato (niente normalizzazione EOL). Ritorna
// { ok, reason } senza scrivere se un marcatore manca o non è a inizio riga.
function spliceClaudeMd(srcPath, dstPath) {
  const srcRaw = readFileSync(srcPath, 'utf8');
  const dstRaw = readFileSync(dstPath, 'utf8');

  const atLineStart = (s, i) => i === 0 || s[i - 1] === '\n';
  const srcIdx = srcRaw.indexOf(MARKER);
  const dstIdx = dstRaw.indexOf(MARKER);

  if (srcIdx < 0 || !atLineStart(srcRaw, srcIdx))
    return { ok: false, reason: `marcatore "${MARKER}" non trovato a inizio riga nel canonico` };
  if (dstIdx < 0 || !atLineStart(dstRaw, dstIdx))
    return { ok: false, reason: `marcatore "${MARKER}" non trovato a inizio riga nel fork` };

  const preamble = srcRaw.slice(0, srcIdx); // canonico, fino al marcatore escluso
  const forkTail = dstRaw.slice(dstIdx);    // fork, dal marcatore incluso
  const merged = preamble + forkTail;

  if (merged === dstRaw) return { ok: true, changed: false };
  writeFileSync(dstPath, merged);
  return { ok: true, changed: true };
}

async function main() {
  const argv = process.argv.slice(2);
  const autoYes = argv.includes('-y') || argv.includes('--yes');
  let target = argv.find((a) => a !== '-y' && a !== '--yes');

  if (!target) target = await ask('Percorso (o nome sottocartella) del fork da sincronizzare: ');
  if (!target) fail('Nessun fork indicato.');

  const fork = resolveFork(target);

  // --- Controlli di sicurezza ---
  if (!existsSync(fork) || !statSync(fork).isDirectory())
    fail(`la cartella fork non esiste: ${fork}`);
  if (resolve(fork) === resolve(SRC))
    fail('il fork coincide con il repo canonico: niente da sincronizzare.');
  if (!existsSync(join(fork, 'package.json')))
    fail(`nessun package.json in ${fork} — non sembra un repo del progetto.`);
  if (!existsSync(join(fork, '.git')))
    fail(`nessuna cartella .git in ${fork} — non è un repo git.`);

  // --- Piano ---
  const profileFiles = readdirSync(join(SRC, PROFILES_DIR)).filter((f) => f.endsWith('.md'));
  console.log(`\n  Canonico : ${SRC}`);
  console.log(`  Fork     : ${fork}\n`);
  console.log('  Copia secca (sovrascrive nel fork):');
  for (const f of COPY_FILES) console.log(`    - ${f}`);
  for (const p of profileFiles) console.log(`    - ${PROFILES_DIR}/${p}`);
  console.log('\n  Splice sicuro (solo parte sopra il marcatore):');
  console.log(`    - CLAUDE.md  [preserva da "${MARKER}" in giù]`);
  console.log('\n  Poi nel fork: npm run generate:scaffold');
  console.log('  (NON committa, NON lancia lint/test — restano a te)\n');

  if (!autoYes) {
    const answer = await ask('  Procedo? [y/N] ');
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('\n  Annullato. Nessun file toccato.\n');
      process.exit(0);
    }
  }

  console.log('');

  // --- 1) Copia secca ---
  for (const rel of COPY_FILES) {
    const src = join(SRC, rel);
    const dst = join(fork, rel);
    if (!existsSync(src)) { console.log(`  ! salto (assente nel canonico): ${rel}`); continue; }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    console.log(`  copiato: ${rel}`);
  }
  for (const p of profileFiles) {
    const rel = `${PROFILES_DIR}/${p}`;
    mkdirSync(join(fork, PROFILES_DIR), { recursive: true });
    copyFileSync(join(SRC, rel), join(fork, rel));
    console.log(`  copiato: ${rel}`);
  }

  // --- 2) Splice CLAUDE.md di root ---
  const srcClaude = join(SRC, 'CLAUDE.md');
  const dstClaude = join(fork, 'CLAUDE.md');
  if (!existsSync(srcClaude)) {
    console.log('  ! CLAUDE.md assente nel canonico: splice saltato.');
  } else if (!existsSync(dstClaude)) {
    console.log('  ! CLAUDE.md assente nel fork: splice saltato (creazione manuale richiesta).');
  } else {
    const r = spliceClaudeMd(srcClaude, dstClaude);
    if (!r.ok) console.log(`  ! CLAUDE.md NON toccato: ${r.reason}.`);
    else if (r.changed) console.log('  spliced: CLAUDE.md (preambolo aggiornato, sezione Progetto preservata)');
    else console.log('  invariato: CLAUDE.md (già allineato)');
  }

  // --- 3) Rigenera il template compilato nel fork ---
  console.log('\n  Rigenero scaffoldTemplate.ts nel fork...');
  const gen = spawnSync('npm', ['run', 'generate:scaffold'], { cwd: fork, stdio: 'inherit', shell: true });
  if (gen.status !== 0) {
    console.log('\n  ! generate:scaffold NON riuscito (fork senza "npm install"?).');
    console.log(`    Lancialo a mano:  cd "${fork}"  &&  npm run generate:scaffold`);
  }

  // --- Promemoria finale ---
  console.log('\n  Fatto. Ora nel fork:');
  console.log(`    cd "${fork}"`);
  console.log('    npm run lint && npm test');
  console.log('    git add -A && git commit -m "chore(method): allinea file di metodo al repo canonico"\n');
}

main();
