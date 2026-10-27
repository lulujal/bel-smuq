/**
 * Unit Test Script for Bell Scheduler & Reduction Logic
 */
const fs = require('fs');

// Mock BellScheduler class
class BellSchedulerMock {
  static parseMinutes(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  static formatHHMM(totalMinutes) {
    let m = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(m / 60) % 24;
    const mins = m % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  static calculateScheduleWithReduction(schedules, reductionConfig) {
    if (!schedules || !schedules.length) return [];
    
    const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time));
    const isEnabled = reductionConfig && reductionConfig.enabled;
    const reductionMins = (reductionConfig && reductionConfig.minutesPerLesson) || 0;
    const reduceBreaks = (reductionConfig && reductionConfig.reduceBreaks) || false;

    if (!isEnabled || reductionMins <= 0) {
      return sorted.map(s => ({
        ...s,
        originalTime: s.time,
        effectiveTime: s.time,
        durationMinutes: 0,
        isReduced: false,
        timeShiftMinutes: 0
      }));
    }

    const calculated = [];
    let cumulativeShift = 0;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentMins = BellSchedulerMock.parseMinutes(current.time);
      const nextMins = next ? BellSchedulerMock.parseMinutes(next.time) : (currentMins + 45);
      const originalDuration = Math.max(5, nextMins - currentMins);

      const effectiveMins = Math.max(0, currentMins - cumulativeShift);
      const effectiveTime = BellSchedulerMock.formatHHMM(effectiveMins);

      const isBreak = (current.type && current.type.toLowerCase().includes('istirahat')) ||
                      (current.period && current.period.toLowerCase().includes('istirahat'));

      // Jam pertama (07.00 - 07.20) tidak dipotong durasinya:
      const isFirstMorningPeriod = (currentMins >= 420 && currentMins < 440) ||
                                   (current.time >= '07:00' && current.time < '07:20');

      let reducedBy = 0;

      if (isFirstMorningPeriod) {
        // Jam pertama 07.00 - 07.20: TIDAK DIPOTONG / TETAP UTUH
        reducedBy = 0;
      } else if (!isBreak) {
        reducedBy = Math.min(reductionMins, Math.max(0, originalDuration - 15));
      } else if (reduceBreaks) {
        reducedBy = Math.min(reductionMins, Math.max(0, originalDuration - 10));
      } else {
        reducedBy = 0; // Break is NEVER reduced!
      }

      calculated.push({
        ...current,
        originalTime: current.time,
        effectiveTime: effectiveTime,
        originalDuration: originalDuration,
        newDuration: originalDuration - reducedBy,
        reducedBy: reducedBy,
        cumulativeShift: cumulativeShift,
        isReduced: cumulativeShift > 0 || reducedBy > 0,
        isBreak: isBreak,
        isFirstMorningPeriod: isFirstMorningPeriod
      });

      cumulativeShift += reducedBy;
    }

    return calculated;
  }
}

// Test Sample Data
const sampleSchedule = [
  { time: '07:00', period: 'Jam Pertama (Renungan & Doa)', type: 'Masuk' },
  { time: '07:20', period: 'Jam Ke-2', type: 'Masuk' },
  { time: '08:05', period: 'Jam Ke-3', type: 'Pergantian Jam' },
  { time: '08:50', period: 'Istirahat 1', type: 'Istirahat' },
  { time: '09:20', period: 'Jam Ke-4', type: 'Masuk' },
  { time: '10:05', period: 'Jam Ke-5', type: 'Pergantian Jam' },
  { time: '10:50', period: 'Doa Bersama & Pulang', type: 'Pulang' }
];

console.log('=== TEST 1: Normal Schedule (No Reduction) ===');
const normal = BellSchedulerMock.calculateScheduleWithReduction(sampleSchedule, { enabled: false });
normal.forEach(item => console.log(`${item.effectiveTime} | ${item.period} (${item.type})`));

console.log('\n=== TEST 2: 5 Minutes Reduction (reduceBreaks = false, Jam 07.00 - 07.20 utuh) ===');
const reduced = BellSchedulerMock.calculateScheduleWithReduction(sampleSchedule, {
  enabled: true,
  minutesPerLesson: 5,
  reduceBreaks: false
});

let testPassed = true;
reduced.forEach(item => {
  console.log(`${item.originalTime} -> ${item.effectiveTime} (shift: -${item.cumulativeShift}m, dur: ${item.newDuration}m) | ${item.period} [${item.isFirstMorningPeriod ? 'JAM PERTAMA 07.00-07.20 (UTUH)' : (item.isBreak ? 'BREAK (UTUH)' : 'LESSON (REDUCED)')}]`);
  if (item.isFirstMorningPeriod && item.reducedBy !== 0) {
    testPassed = false;
    console.error('FAIL: Jam pertama 07.00 - 07.20 was reduced!');
  }
  if (item.isBreak && item.reducedBy !== 0) {
    testPassed = false;
    console.error('FAIL: Break was reduced!');
  }
});

// Verify 07:00 - 07:20 session
const firstItem = reduced[0];
if (firstItem.effectiveTime !== '07:00' || firstItem.newDuration !== 20) {
  testPassed = false;
  console.error(`FAIL: First item duration/time mismatch: ${firstItem.effectiveTime}, duration: ${firstItem.newDuration}`);
} else {
  console.log(`\nPASSED: Jam pertama 07:00 - 07:20 tetap utuh berdurasi 20 menit (07:00 -> 07:20)!`);
}

// Verify break duration specifically
const breakItem = reduced.find(r => r.isBreak);
if (breakItem.newDuration !== breakItem.originalDuration) {
  testPassed = false;
  console.error(`FAIL: Break duration changed from ${breakItem.originalDuration} to ${breakItem.newDuration}`);
} else {
  console.log(`PASSED: Break duration preserved completely (${breakItem.originalDuration} mins original == ${breakItem.newDuration} mins new)!`);
}

if (testPassed) {
  console.log('\n ALL LOGICAL TESTS PASSED SUCCESSFULLY! ');
} else {
  process.exit(1);
}
