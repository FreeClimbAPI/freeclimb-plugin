---
name: freeclimb-test-flow
description: Validate a FreeClimb flow's PerCL and simulate the webhook path with realistic FreeClimb request bodies before a live call.
argument-hint: [route or app description]
---

# /freeclimb-test-flow

Validate and simulate a FreeClimb voice or SMS flow before placing a live call or sending a live SMS. If an argument is provided, focus on that route or app; otherwise infer routes from the current project. Load and follow the `verify-flow` skill.
