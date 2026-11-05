# Readiness and Load are computed in the app, not taken from Garmin

Garmin has its own Training Readiness and training-load figures, but the Personal API endpoints we could verify expose none of them (only per-Session training load). So Readiness (Signals against the owner's 28-day baseline) and Load (7-day against the 28-day norm of Garmin's per-Session load) are computed here and labelled as not Garmin's, so they can differ from the watch. If the Swagger spec turns out to expose them, swap the computation and keep the terms.
