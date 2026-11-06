# Garmin Companion

A private dashboard that reads the owner's Garmin Connect data and answers whether to train hard or easy today.

## Language

**Activity**:
Everyday movement and effort that isn't a specific workout: steps, intensity minutes, stress, calories.
_Avoid_: Workout (use Session)

**Session**:
One specific recorded workout, such as a run or a ride.
_Avoid_: Activity (too general), Workout

## Home

**Tile**:
One unit of the Home grid that the owner can show, hide and reorder.
_Avoid_: Card (a Card is only the shared display component)

## Metrics

**Metric**:
A single stat shown on a Tile with a 7-day trend, such as HRV, steps or stress.
_Avoid_: Stat, Card (a Card is only the shared display component)

**Signal**:
A recovery Metric that feeds Readiness: HRV, resting heart rate, sleep, Body Battery peak.
_Avoid_: Activity stat (steps, intensity and stress are not Signals)

## Verdicts

**Readiness**:
The app's own verdict on training hard or easy today, judged from the Signals against the owner's previous 28 days. Not Garmin's Training Readiness.
_Avoid_: Training Readiness (Garmin's separate number)

**Load**:
The app's own measure of recent training against the owner's usual, built from Garmin's training load for each Session: the last 7 days compared with the 28-day norm. Not a Garmin number.
_Avoid_: Training Load (Garmin's per-Session figure)

## Analysis

**Sport page**:
A dedicated analysis page for one sport, such as running or strength.

**Impact**:
How the Signals change after a kind of Session, compared with the owner's usual. An association, not a cause.
_Avoid_: Effect (implies cause)
