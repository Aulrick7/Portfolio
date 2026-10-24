---
type: PageLayout
title: Choose Your Path
colors: colors-a
sections:
  # The Matrix / Tron grid for projects (blue pill): game projects left, software projects right,
  # and a straight lane that rides off to the full Projects page.
  # Projects come from content/pages/projects (their `filter: game | software` picks the lane).
  # Change the type to ProjectChoiceSection for the old flat "Choose your path" page.
  - type: MatrixGrid
    world: projects
    elementId: project-choice
---
