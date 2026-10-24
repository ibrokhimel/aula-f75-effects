// Stable public IDs and controls from the implementation checklist.
import type { AnimationParameter } from '../animations/parameters';
export interface ExpansionSpec {number:number;id:string;name:string;family:string;description:string;runtime:string;controls:readonly AnimationParameter[]}
export const EXPANSION_CATALOG: readonly ExpansionSpec[] = [
  {
    "number": 1,
    "id": "expansion.life-colony",
    "name": "Life Colony",
    "family": "Cellular worlds",
    "description": "Clusters of lit cells grow, split, and disappear according to their occupied neighbors",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "density",
        "label": "Initial population",
        "kind": "range",
        "default": 0.3,
        "min": 0.05,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "tickRate",
        "label": "Generations per second",
        "kind": "range",
        "default": 6,
        "min": 1,
        "max": 20,
        "step": 1,
        "unit": "Hz"
      }
    ]
  },
  {
    "number": 2,
    "id": "expansion.three-state-sparks",
    "name": "Three-State Sparks",
    "family": "Cellular worlds",
    "description": "A cell flashes, rests, then becomes ready again, creating traveling sparks with a built-in recovery period",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "density",
        "label": "Initial excitation",
        "kind": "range",
        "default": 0.15,
        "min": 0.02,
        "max": 0.5,
        "step": 0.01,
        "unit": "ratio"
      },
      {
        "id": "recovery",
        "label": "Recovery duration",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "steps"
      }
    ]
  },
  {
    "number": 3,
    "id": "expansion.cyclic-dominion",
    "name": "Cyclic Dominion",
    "family": "Cellular worlds",
    "description": "Several colors invade the next color in a cycle, forming fronts that chase each other around the board",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "states",
        "label": "Color states",
        "kind": "range",
        "default": 5,
        "min": 3,
        "max": 12,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "threshold",
        "label": "Invading neighbors",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 5,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 4,
    "id": "expansion.turmite-trails",
    "name": "Turmite Trails",
    "family": "Cellular worlds",
    "description": "A tiny virtual walker turns according to the cell color and changes that color as it passes",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "walkers",
        "label": "Walker count",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "steps",
        "label": "Walker steps per second",
        "kind": "range",
        "default": 12,
        "min": 1,
        "max": 60,
        "step": 1,
        "unit": "Hz"
      }
    ]
  },
  {
    "number": 5,
    "id": "expansion.wireworld-circuit",
    "name": "Wireworld Circuit",
    "family": "Cellular worlds",
    "description": "Electrical pulses travel through a generated conductor network, branching and crossing along readable paths",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "branches",
        "label": "Branch density",
        "kind": "range",
        "default": 0.35,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "pulseInterval",
        "label": "Pulse interval",
        "kind": "range",
        "default": 2,
        "min": 0.3,
        "max": 8,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 6,
    "id": "expansion.sandpile-cascade",
    "name": "Sandpile Cascade",
    "family": "Cellular worlds",
    "description": "Light accumulates on cells until a threshold tips it into neighbors and starts a chain of topplings",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "sources",
        "label": "Grain sources",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 10,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "addition",
        "label": "Addition rate",
        "kind": "range",
        "default": 8,
        "min": 1,
        "max": 40,
        "step": 1,
        "unit": "grains/s"
      }
    ]
  },
  {
    "number": 7,
    "id": "expansion.reaction-islands",
    "name": "Reaction Islands",
    "family": "Cellular worlds",
    "description": "Two interacting fields organize into growing spots and channels that change shape over time",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "feed",
        "label": "Feed coefficient",
        "kind": "range",
        "default": 0.04,
        "min": 0.01,
        "max": 0.09,
        "step": 0.001,
        "unit": "coefficient"
      },
      {
        "id": "removal",
        "label": "Removal coefficient",
        "kind": "range",
        "default": 0.06,
        "min": 0.03,
        "max": 0.08,
        "step": 0.001,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 8,
    "id": "expansion.wavefront-labyrinth",
    "name": "Wavefront Labyrinth",
    "family": "Cellular worlds",
    "description": "A front of color propagates through a maze, bending around walls rather than passing through them",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "complexity",
        "label": "Maze complexity",
        "kind": "range",
        "default": 0.6,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "speed",
        "label": "Front speed",
        "kind": "range",
        "default": 5,
        "min": 1,
        "max": 20,
        "step": 1,
        "unit": "cells/s"
      }
    ]
  },
  {
    "number": 9,
    "id": "expansion.firebreak-forest",
    "name": "Firebreak Forest",
    "family": "Cellular worlds",
    "description": "Growing cells form a forest; a moving ignition consumes connected patches, leaving gaps that slowly regrow",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "growth",
        "label": "Growth chance",
        "kind": "range",
        "default": 0.08,
        "min": 0.01,
        "max": 0.3,
        "step": 0.01,
        "unit": "ratio"
      },
      {
        "id": "regrowth",
        "label": "Regrowth delay",
        "kind": "range",
        "default": 6,
        "min": 1,
        "max": 30,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 10,
    "id": "expansion.neighborhood-drift",
    "name": "Neighborhood Drift",
    "family": "Cellular worlds",
    "description": "Colored agents relocate toward nearby groups with similar colors, gradually sorting a mixed board into�",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "population",
        "label": "Occupied fraction",
        "kind": "range",
        "default": 0.7,
        "min": 0.2,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "agreement",
        "label": "Preferred agreement",
        "kind": "range",
        "default": 0.55,
        "min": 0.2,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 11,
    "id": "expansion.thermal-domains",
    "name": "Thermal Domains",
    "family": "Cellular worlds",
    "description": "Neighboring cells tend to agree on a color, while an adjustable agitation level breaks up large regions",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "temperature",
        "label": "Agitation",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "coupling",
        "label": "Neighbor coupling",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 12,
    "id": "expansion.conserved-shuffle",
    "name": "Conserved Shuffle",
    "family": "Cellular worlds",
    "description": "Bright cells exchange positions with dark cells, making a moving pattern with a stable total amount of light",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "population",
        "label": "Lit fraction",
        "kind": "range",
        "default": 0.35,
        "min": 0.05,
        "max": 0.85,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "drift",
        "label": "Directional drift",
        "kind": "range",
        "default": 0.4,
        "min": -1,
        "max": 1,
        "step": 0.1,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 13,
    "id": "expansion.ferrofluid-peaks",
    "name": "Ferrofluid Peaks",
    "family": "Fluid and material",
    "description": "Dark pools gather around moving magnetic points, producing bright ridges and short spikes around each pool",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "poles",
        "label": "Pole count",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "sharpness",
        "label": "Peak sharpness",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 1,
        "unit": "power"
      }
    ]
  },
  {
    "number": 14,
    "id": "expansion.marbling-streaks",
    "name": "Marbling Streaks",
    "family": "Fluid and material",
    "description": "Thin ribbons of color stretch and fold through a slow fluid field without immediately blending away",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "viscosity",
        "label": "Flow damping",
        "kind": "range",
        "default": 0.8,
        "min": 0.2,
        "max": 0.98,
        "step": 0.02,
        "unit": "ratio"
      },
      {
        "id": "diffusion",
        "label": "Pigment diffusion",
        "kind": "range",
        "default": 0.02,
        "min": 0,
        "max": 0.2,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 15,
    "id": "expansion.droplet-coalescence",
    "name": "Droplet Coalescence",
    "family": "Fluid and material",
    "description": "Small round droplets wander, merge into larger drops, and occasionally split as a moving flow pulls them apart",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "count",
        "label": "Initial droplets",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 40,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "tension",
        "label": "Surface tension",
        "kind": "range",
        "default": 0.65,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 16,
    "id": "expansion.pigment-separation",
    "name": "Pigment Separation",
    "family": "Fluid and material",
    "description": "Initially mixed colors gradually separate into drifting patches with soft, unstable boundaries",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "contrast",
        "label": "Phase contrast",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "mobility",
        "label": "Phase mobility",
        "kind": "range",
        "default": 0.35,
        "min": 0.05,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 17,
    "id": "expansion.capillary-climb",
    "name": "Capillary Climb",
    "family": "Fluid and material",
    "description": "Color climbs narrow branching channels, pauses at junctions, and slowly fills their connected tips",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "rise",
        "label": "Climb speed",
        "kind": "range",
        "default": 2,
        "min": 0.2,
        "max": 8,
        "step": 0.2,
        "unit": "units/s"
      },
      {
        "id": "junctionDelay",
        "label": "Junction pause",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 18,
    "id": "expansion.viscous-curtain",
    "name": "Viscous Curtain",
    "family": "Fluid and material",
    "description": "A hanging sheet of light stretches downward into uneven fingers, then tears into falling drops",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "stretch",
        "label": "Stretch rate",
        "kind": "range",
        "default": 1.5,
        "min": 0.2,
        "max": 4,
        "step": 0.1,
        "unit": "units/s"
      },
      {
        "id": "tear",
        "label": "Tear threshold",
        "kind": "range",
        "default": 0.65,
        "min": 0.2,
        "max": 0.95,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 19,
    "id": "expansion.foam-network",
    "name": "Foam Network",
    "family": "Fluid and material",
    "description": "Bubble regions expand and collapse while their boundaries carry most of the light",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "count",
        "label": "Bubble count",
        "kind": "range",
        "default": 10,
        "min": 3,
        "max": 25,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "collapse",
        "label": "Collapse interval",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 15,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 20,
    "id": "expansion.crystallizing-melt",
    "name": "Crystallizing Melt",
    "family": "Fluid and material",
    "description": "A moving temperature boundary switches flowing color into fixed facets, then melts those facets back into�",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "temperature",
        "label": "Temperature bias",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "hysteresis",
        "label": "Freeze/melt separation",
        "kind": "range",
        "default": 0.15,
        "min": 0.02,
        "max": 0.4,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 21,
    "id": "expansion.drying-pigment",
    "name": "Drying Pigment",
    "family": "Fluid and material",
    "description": "A shrinking wet patch leaves concentrated color around its retreating edge",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "drying",
        "label": "Drying speed",
        "kind": "range",
        "default": 0.04,
        "min": 0.005,
        "max": 0.15,
        "step": 0.005,
        "unit": "ratio/s"
      },
      {
        "id": "deposit",
        "label": "Edge concentration",
        "kind": "range",
        "default": 0.75,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 22,
    "id": "expansion.oil-and-water",
    "name": "Oil and Water",
    "family": "Fluid and material",
    "description": "Two fluids move at different speeds, forming buoyant layers that curl and separate at their boundary",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "buoyancy",
        "label": "Buoyancy",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1.5,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "shear",
        "label": "Layer shear",
        "kind": "range",
        "default": 0.4,
        "min": -1,
        "max": 1,
        "step": 0.1,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 23,
    "id": "expansion.pendulum-paint",
    "name": "Pendulum Paint",
    "family": "Fluid and material",
    "description": "A swinging point deposits a lasting line that gradually builds a woven drawing before fading",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "persistence",
        "label": "Paint persistence",
        "kind": "range",
        "default": 8,
        "min": 1,
        "max": 30,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "width",
        "label": "Stroke width",
        "kind": "range",
        "default": 0.3,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 24,
    "id": "expansion.refracted-ripples",
    "name": "Refracted Ripples",
    "family": "Fluid and material",
    "description": "Wavefronts cross regions with different propagation speeds, bending and compressing as they cross the�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "contrast",
        "label": "Speed contrast",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "angle",
        "label": "Boundary angle",
        "kind": "range",
        "default": 25,
        "min": -80,
        "max": 80,
        "step": 5,
        "unit": "degrees"
      }
    ]
  },
  {
    "number": 25,
    "id": "expansion.prism-split",
    "name": "Prism Split",
    "family": "Light and optics",
    "description": "A moving white beam enters a virtual prism and leaves as separated color bands",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "separation",
        "label": "Color separation",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "angle",
        "label": "Prism angle",
        "kind": "range",
        "default": 30,
        "min": -60,
        "max": 60,
        "step": 5,
        "unit": "degrees"
      }
    ]
  },
  {
    "number": 26,
    "id": "expansion.lens-sweep",
    "name": "Lens Sweep",
    "family": "Light and optics",
    "description": "A traveling lens magnifies and bends an underlying pattern within a small area",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "radius",
        "label": "Lens radius",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 8,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "distortion",
        "label": "Magnification",
        "kind": "range",
        "default": 1.5,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 27,
    "id": "expansion.slit-diffraction",
    "name": "Slit Diffraction",
    "family": "Light and optics",
    "description": "A wave hits a barrier with a narrow opening and fans outward from the opening",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "opening",
        "label": "Opening width",
        "kind": "range",
        "default": 0.6,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "wavelength",
        "label": "Wavelength",
        "kind": "range",
        "default": 1.5,
        "min": 0.5,
        "max": 4,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 28,
    "id": "expansion.two-slit-light",
    "name": "Two-Slit Light",
    "family": "Light and optics",
    "description": "Two openings produce interacting wave bands whose spacing changes as the openings move",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "spacing",
        "label": "Slit spacing",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 6,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "wavelength",
        "label": "Wavelength",
        "kind": "range",
        "default": 1.2,
        "min": 0.3,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 29,
    "id": "expansion.shadow-theater",
    "name": "Shadow Theater",
    "family": "Light and optics",
    "description": "Large moving objects block a soft light source, casting readable shadows across an otherwise lit board",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "occluders",
        "label": "Object count",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "softness",
        "label": "Light-source size",
        "kind": "range",
        "default": 0.5,
        "min": 0.05,
        "max": 2,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 30,
    "id": "expansion.iris-shutter",
    "name": "Iris Shutter",
    "family": "Light and optics",
    "description": "Overlapping shutter blades gradually reveal and cover a background pattern from the center outward",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "blades",
        "label": "Blade count",
        "kind": "range",
        "default": 6,
        "min": 3,
        "max": 10,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "aperture",
        "label": "Opening fraction",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 31,
    "id": "expansion.chromatic-outlines",
    "name": "Chromatic Outlines",
    "family": "Light and optics",
    "description": "The red, green, and blue edges of a selected pattern separate slightly and slide back together",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "offset",
        "label": "Channel offset",
        "kind": "range",
        "default": 0.35,
        "min": 0,
        "max": 1.5,
        "step": 0.05,
        "unit": "u"
      },
      {
        "id": "edgeGain",
        "label": "Edge emphasis",
        "kind": "range",
        "default": 1.2,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 32,
    "id": "expansion.light-sheet-slice",
    "name": "Light-Sheet Slice",
    "family": "Light and optics",
    "description": "A thin plane moves through a virtual shape, revealing a changing cross-section on the keyboard",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "slice",
        "label": "Slice position",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "thickness",
        "label": "Sheet thickness",
        "kind": "range",
        "default": 0.15,
        "min": 0.05,
        "max": 0.6,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 33,
    "id": "expansion.stained-glass",
    "name": "Stained Glass",
    "family": "Light and optics",
    "description": "Stable cell boundaries stay dark while a slow moving light illuminates the colored cells behind them",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "lead",
        "label": "Lead width",
        "kind": "range",
        "default": 0.08,
        "min": 0.02,
        "max": 0.25,
        "step": 0.01,
        "unit": "ratio"
      },
      {
        "id": "lightWidth",
        "label": "Light spread",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 10,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 34,
    "id": "expansion.opal-turn",
    "name": "Opal Turn",
    "family": "Light and optics",
    "description": "Broad iridescent bands change hue as a virtual viewing angle rotates, while their brightness stays restrained",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "angle",
        "label": "Viewing angle",
        "kind": "range",
        "default": 0,
        "min": -180,
        "max": 180,
        "step": 5,
        "unit": "degrees"
      },
      {
        "id": "chroma",
        "label": "Iridescence strength",
        "kind": "range",
        "default": 0.7,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 35,
    "id": "expansion.crossed-polarizers",
    "name": "Crossed Polarizers",
    "family": "Light and optics",
    "description": "Two rotating orientation fields control transmission, creating bands that brighten and extinguish where�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "offset",
        "label": "Relative angle",
        "kind": "range",
        "default": 45,
        "min": 0,
        "max": 90,
        "step": 1,
        "unit": "degrees"
      },
      {
        "id": "twist",
        "label": "Spatial twist",
        "kind": "range",
        "default": 1,
        "min": 0,
        "max": 4,
        "step": 0.1,
        "unit": "turns"
      }
    ]
  },
  {
    "number": 36,
    "id": "expansion.dithered-mist",
    "name": "Dithered Mist",
    "family": "Light and optics",
    "description": "An existing soft effect is rendered as a changing arrangement of dim and bright keys instead of�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "levels",
        "label": "Brightness levels",
        "kind": "range",
        "default": 3,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "grain",
        "label": "Dither scale",
        "kind": "range",
        "default": 1,
        "min": 0.5,
        "max": 3,
        "step": 0.25,
        "unit": "u"
      }
    ]
  },
  {
    "number": 37,
    "id": "expansion.elliptical-rendezvous",
    "name": "Elliptical Rendezvous",
    "family": "Orbital and cosmic",
    "description": "Several bodies move around offset elliptical paths, speeding through one side and slowing through the other",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "eccentricity",
        "label": "Orbit eccentricity",
        "kind": "range",
        "default": 0.55,
        "min": 0,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "count",
        "label": "Body count",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 10,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 38,
    "id": "expansion.binary-eclipse",
    "name": "Binary Eclipse",
    "family": "Orbital and cosmic",
    "description": "Two luminous disks rotate around a common center and periodically obscure one another",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "ratio",
        "label": "Body size ratio",
        "kind": "range",
        "default": 0.7,
        "min": 0.2,
        "max": 1.5,
        "step": 0.1,
        "unit": "ratio"
      },
      {
        "id": "separation",
        "label": "Orbit separation",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 7,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 39,
    "id": "expansion.orbital-convoy",
    "name": "Orbital Convoy",
    "family": "Orbital and cosmic",
    "description": "A moving body leads a train of smaller lights that bunch and stretch along its curved route",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "followers",
        "label": "Follower count",
        "kind": "range",
        "default": 7,
        "min": 2,
        "max": 20,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "gap",
        "label": "Following delay",
        "kind": "range",
        "default": 0.18,
        "min": 0.04,
        "max": 0.7,
        "step": 0.02,
        "unit": "s"
      }
    ]
  },
  {
    "number": 40,
    "id": "expansion.accretion-shear",
    "name": "Accretion Shear",
    "family": "Orbital and cosmic",
    "description": "Inner bands rotate faster than outer bands, stretching colored clumps into a winding disk",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "shear",
        "label": "Radial shear",
        "kind": "range",
        "default": 1.3,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "clumps",
        "label": "Bright clumps",
        "kind": "range",
        "default": 6,
        "min": 2,
        "max": 16,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 41,
    "id": "expansion.pulsar-lighthouse",
    "name": "Pulsar Lighthouse",
    "family": "Orbital and cosmic",
    "description": "Two narrow beams rotate from a bright center over a much darker background",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "beam",
        "label": "Beam width",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 50,
        "step": 1,
        "unit": "degrees"
      },
      {
        "id": "core",
        "label": "Core radius",
        "kind": "range",
        "default": 0.5,
        "min": 0.2,
        "max": 2,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 42,
    "id": "expansion.nebula-collapse",
    "name": "Nebula Collapse",
    "family": "Orbital and cosmic",
    "description": "A diffuse cloud slowly condenses into bright points before the next cycle disperses them",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "clusters",
        "label": "Collapse centers",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "cycle",
        "label": "Collapse cycle",
        "kind": "range",
        "default": 16,
        "min": 6,
        "max": 60,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 43,
    "id": "expansion.asteroid-lanes",
    "name": "Asteroid Lanes",
    "family": "Orbital and cosmic",
    "description": "Streams of small debris pass in different directions and speeds, with occasional gaps and denser clusters",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "lanes",
        "label": "Lane count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "density",
        "label": "Debris density",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 44,
    "id": "expansion.solar-windfront",
    "name": "Solar Windfront",
    "family": "Orbital and cosmic",
    "description": "A broad curved front sweeps across the board and pushes faint particles ahead of it",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "curvature",
        "label": "Front curvature",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "push",
        "label": "Particle push",
        "kind": "range",
        "default": 1.5,
        "min": 0,
        "max": 4,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 45,
    "id": "expansion.gravity-lens",
    "name": "Gravity Lens",
    "family": "Orbital and cosmic",
    "description": "A moving mass bends the apparent positions of an underlying star pattern",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "mass",
        "label": "Lens strength",
        "kind": "range",
        "default": 1,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "radius",
        "label": "Lens reach",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 7,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 46,
    "id": "expansion.planet-transit",
    "name": "Planet Transit",
    "family": "Orbital and cosmic",
    "description": "A dark planet passes over a glowing surface with a soft luminous edge around the silhouette",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "radius",
        "label": "Planet radius",
        "kind": "range",
        "default": 1.5,
        "min": 0.4,
        "max": 4,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "rim",
        "label": "Rim width",
        "kind": "range",
        "default": 0.18,
        "min": 0.05,
        "max": 0.6,
        "step": 0.01,
        "unit": "u"
      }
    ]
  },
  {
    "number": 47,
    "id": "expansion.resonant-alignment",
    "name": "Resonant Alignment",
    "family": "Orbital and cosmic",
    "description": "Independent orbit periods occasionally align several moving points into a brief bright line",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "bodies",
        "label": "Body count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "tolerance",
        "label": "Alignment tolerance",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 30,
        "step": 1,
        "unit": "degrees"
      }
    ]
  },
  {
    "number": 48,
    "id": "expansion.redshift-flight",
    "name": "Redshift Flight",
    "family": "Orbital and cosmic",
    "description": "The existing outward star motion gains distance-driven color, a dark central passage, and adjustable�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "shift",
        "label": "Distance hue shift",
        "kind": "range",
        "default": 0.25,
        "min": 0,
        "max": 0.5,
        "step": 0.01,
        "unit": "turns"
      },
      {
        "id": "acceleration",
        "label": "Flight acceleration",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 49,
    "id": "expansion.weather-fronts",
    "name": "Weather Fronts",
    "family": "Weather and landscapes",
    "description": "Warm and cool regions push against each other while a bright boundary slowly crosses the keyboard",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "width",
        "label": "Front width",
        "kind": "range",
        "default": 0.8,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "contrast",
        "label": "Warm/cool contrast",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 50,
    "id": "expansion.tornado-track",
    "name": "Tornado Track",
    "family": "Weather and landscapes",
    "description": "A localized rotating funnel travels across the board, pulling nearby particles into its wake",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "core",
        "label": "Vortex radius",
        "kind": "range",
        "default": 1.8,
        "min": 0.5,
        "max": 5,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "swirl",
        "label": "Angular strength",
        "kind": "range",
        "default": 2,
        "min": 0.2,
        "max": 5,
        "step": 0.2,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 51,
    "id": "expansion.river-delta",
    "name": "River Delta",
    "family": "Weather and landscapes",
    "description": "A bright river splits into narrow channels that gradually claim new paths toward the edge",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "branching",
        "label": "Branch probability",
        "kind": "range",
        "default": 0.25,
        "min": 0.05,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "flow",
        "label": "Flow speed",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 8,
        "step": 0.5,
        "unit": "units/s"
      }
    ]
  },
  {
    "number": 52,
    "id": "expansion.meander-migration",
    "name": "Meander Migration",
    "family": "Weather and landscapes",
    "description": "A winding stream slowly shifts its curves, leaving fading traces of its previous route",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "bend",
        "label": "Bend strength",
        "kind": "range",
        "default": 1.2,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "memory",
        "label": "Old-channel trace",
        "kind": "range",
        "default": 8,
        "min": 1,
        "max": 30,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 53,
    "id": "expansion.glacier-calving",
    "name": "Glacier Calving",
    "family": "Weather and landscapes",
    "description": "A large pale region develops cracks; pieces separate and drift into a darker field",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "fracture",
        "label": "Fracture rate",
        "kind": "range",
        "default": 0.2,
        "min": 0.05,
        "max": 0.6,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "drift",
        "label": "Ice drift",
        "kind": "range",
        "default": 0.25,
        "min": 0.05,
        "max": 1,
        "step": 0.05,
        "unit": "units/s"
      }
    ]
  },
  {
    "number": 54,
    "id": "expansion.sea-ice-leads",
    "name": "Sea-Ice Leads",
    "family": "Weather and landscapes",
    "description": "Thin dark channels open through a bright sheet, widen under moving pressure, and gradually close",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "pressure",
        "label": "Pressure strength",
        "kind": "range",
        "default": 0.6,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "closure",
        "label": "Closure time",
        "kind": "range",
        "default": 12,
        "min": 2,
        "max": 40,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 55,
    "id": "expansion.migrating-dunes",
    "name": "Migrating Dunes",
    "family": "Weather and landscapes",
    "description": "Long ridges move across the board, piling up on one side and eroding on the other",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "spacing",
        "label": "Dune spacing",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 7,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "asymmetry",
        "label": "Lee-side steepness",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 0.95,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 56,
    "id": "expansion.rain-shadow",
    "name": "Rain Shadow",
    "family": "Weather and landscapes",
    "description": "A virtual ridge diverts cloud movement, creating a wet bright side and a drier, quieter side",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "height",
        "label": "Ridge strength",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "wind",
        "label": "Wind direction",
        "kind": "range",
        "default": 1,
        "min": -1,
        "max": 1,
        "step": 0.1,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 57,
    "id": "expansion.convection-cells",
    "name": "Convection Cells",
    "family": "Weather and landscapes",
    "description": "Heat rises through several slow circulation loops and sinks in cooler lanes between them",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "cells",
        "label": "Circulation cells",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 7,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "buoyancy",
        "label": "Heat drive",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 58,
    "id": "expansion.branching-lightning",
    "name": "Branching Lightning",
    "family": "Weather and landscapes",
    "description": "The existing storm grows persistent branching channels that illuminate in segments before fading",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "branches",
        "label": "Branch limit",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 20,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "duration",
        "label": "Channel decay",
        "kind": "range",
        "default": 0.3,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "s"
      }
    ]
  },
  {
    "number": 59,
    "id": "expansion.layered-cloud-deck",
    "name": "Layered Cloud Deck",
    "family": "Weather and landscapes",
    "description": "Several cloud masks move independently, producing changing depth and overlaps over the existing moonlit�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "layers",
        "label": "Cloud layers",
        "kind": "range",
        "default": 3,
        "min": 2,
        "max": 5,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "parallax",
        "label": "Speed separation",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 1.5,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 60,
    "id": "expansion.fog-bank",
    "name": "Fog Bank",
    "family": "Weather and landscapes",
    "description": "A soft, uneven wall of light rolls across the board and exposes small clear patches behind it",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "coverage",
        "label": "Fog coverage",
        "kind": "range",
        "default": 0.55,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "softness",
        "label": "Edge softness",
        "kind": "range",
        "default": 1.5,
        "min": 0.3,
        "max": 4,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 61,
    "id": "expansion.mycelium-routes",
    "name": "Mycelium Routes",
    "family": "Living systems",
    "description": "Branching filaments grow toward dim resource points and reinforce paths that successfully connect them",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "tips",
        "label": "Active growth tips",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 40,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "branching",
        "label": "Branch chance",
        "kind": "range",
        "default": 0.15,
        "min": 0.02,
        "max": 0.5,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 62,
    "id": "expansion.root-foraging",
    "name": "Root Foraging",
    "family": "Living systems",
    "description": "Roots extend toward resource patches, split when they reach them, and retreat from depleted areas",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "resources",
        "label": "Resource patches",
        "kind": "range",
        "default": 6,
        "min": 2,
        "max": 16,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "consumption",
        "label": "Consumption rate",
        "kind": "range",
        "default": 0.1,
        "min": 0.02,
        "max": 0.4,
        "step": 0.02,
        "unit": "ratio/s"
      }
    ]
  },
  {
    "number": 63,
    "id": "expansion.predator-and-prey",
    "name": "Predator and Prey",
    "family": "Living systems",
    "description": "Two populations chase and evade one another; their numbers rise and fall as the pattern evolves",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "prey",
        "label": "Initial prey",
        "kind": "range",
        "default": 24,
        "min": 6,
        "max": 60,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "predators",
        "label": "Initial predators",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 64,
    "id": "expansion.firefly-synchrony",
    "name": "Firefly Synchrony",
    "family": "Living systems",
    "description": "Scattered points begin blinking independently and gradually synchronize with nearby points",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "coupling",
        "label": "Synchronization",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "spread",
        "label": "Natural tempo spread",
        "kind": "range",
        "default": 0.2,
        "min": 0,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 65,
    "id": "expansion.coral-competition",
    "name": "Coral Competition",
    "family": "Living systems",
    "description": "Colored colonies expand until they meet, then compete along their shared boundaries",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "colonies",
        "label": "Colony count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "competition",
        "label": "Boundary pressure",
        "kind": "range",
        "default": 0.45,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 66,
    "id": "expansion.leaf-veins",
    "name": "Leaf Veins",
    "family": "Living systems",
    "description": "A main vein grows secondary branches that connect scattered points on the keyboard",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "attractors",
        "label": "Branch targets",
        "kind": "range",
        "default": 20,
        "min": 6,
        "max": 60,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "width",
        "label": "Vein width",
        "kind": "range",
        "default": 0.2,
        "min": 0.05,
        "max": 0.7,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 67,
    "id": "expansion.pollinator-routes",
    "name": "Pollinator Routes",
    "family": "Living systems",
    "description": "Small moving lights visit growing flower points, causing short blooms at each stop",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "visitors",
        "label": "Pollinator count",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "cooldown",
        "label": "Flower cooldown",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 15,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 68,
    "id": "expansion.spore-landing",
    "name": "Spore Landing",
    "family": "Living systems",
    "description": "Wind carries drifting spores; some settle and start small colonies that grow and fade",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "wind",
        "label": "Wind strength",
        "kind": "range",
        "default": 0.6,
        "min": -1.5,
        "max": 1.5,
        "step": 0.1,
        "unit": "units/s"
      },
      {
        "id": "landing",
        "label": "Landing chance",
        "kind": "range",
        "default": 0.12,
        "min": 0.02,
        "max": 0.5,
        "step": 0.02,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 69,
    "id": "expansion.slime-trail-network",
    "name": "Slime Trail Network",
    "family": "Living systems",
    "description": "Moving agents deposit trails and then follow those trails, creating reinforced routes and shortcuts",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "agents",
        "label": "Agent count",
        "kind": "range",
        "default": 40,
        "min": 10,
        "max": 120,
        "step": 5,
        "unit": "count"
      },
      {
        "id": "decay",
        "label": "Trail retention",
        "kind": "range",
        "default": 0.94,
        "min": 0.7,
        "max": 0.99,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 70,
    "id": "expansion.spring-succession",
    "name": "Spring Succession",
    "family": "Living systems",
    "description": "A scene progresses from sparse roots to blooms, drifting pollen, and a quiet dormant phase",
    "runtime": "scene",
    "controls": [
      {
        "id": "seasonLength",
        "label": "Season length",
        "kind": "range",
        "default": 40,
        "min": 12,
        "max": 180,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "overlap",
        "label": "Phase overlap",
        "kind": "range",
        "default": 0.15,
        "min": 0,
        "max": 0.4,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 71,
    "id": "expansion.tidepool-colonies",
    "name": "Tidepool Colonies",
    "family": "Living systems",
    "description": "Small colonies become visible as a moving tide retreats, then glow differently when covered again",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "tide",
        "label": "Tide amplitude",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "period",
        "label": "Tide period",
        "kind": "range",
        "default": 18,
        "min": 6,
        "max": 60,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 72,
    "id": "expansion.circadian-garden",
    "name": "Circadian Garden",
    "family": "Living systems",
    "description": "Existing growth and day-cycle effects share one slow clock so flowers, color temperature, and brightness�",
    "runtime": "scene",
    "controls": [
      {
        "id": "dayLength",
        "label": "Day length",
        "kind": "range",
        "default": 90,
        "min": 20,
        "max": 600,
        "step": 5,
        "unit": "s"
      },
      {
        "id": "nightFloor",
        "label": "Night glow",
        "kind": "range",
        "default": 0.08,
        "min": 0,
        "max": 0.3,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 73,
    "id": "expansion.gear-train",
    "name": "Gear Train",
    "family": "Mechanical motion",
    "description": "Adjacent rotating fields turn in alternating directions and visibly transfer motion from one region to another",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "gears",
        "label": "Gear count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "teeth",
        "label": "Tooth count",
        "kind": "range",
        "default": 8,
        "min": 4,
        "max": 16,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 74,
    "id": "expansion.ratchet-march",
    "name": "Ratchet March",
    "family": "Mechanical motion",
    "description": "A ring advances in short jumps, rebounds slightly, and rests between steps",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "steps",
        "label": "Steps per revolution",
        "kind": "range",
        "default": 8,
        "min": 3,
        "max": 20,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "dwell",
        "label": "Rest fraction",
        "kind": "range",
        "default": 0.65,
        "min": 0.2,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 75,
    "id": "expansion.conveyor-sorter",
    "name": "Conveyor Sorter",
    "family": "Mechanical motion",
    "description": "Colored packets travel along lanes and are directed into different branches by moving gates",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "packets",
        "label": "Packet cap",
        "kind": "range",
        "default": 16,
        "min": 4,
        "max": 40,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "gatePeriod",
        "label": "Gate period",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 10,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 76,
    "id": "expansion.escapement-tick",
    "name": "Escapement Tick",
    "family": "Mechanical motion",
    "description": "A pendulum-like light releases a second motion in discrete ticks instead of a continuous sweep",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "period",
        "label": "Pendulum period",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 6,
        "step": 0.1,
        "unit": "s"
      },
      {
        "id": "swing",
        "label": "Swing reach",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 7,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 77,
    "id": "expansion.cam-lift",
    "name": "Cam Lift",
    "family": "Mechanical motion",
    "description": "Columns rise and fall according to differently shaped cam curves, with distinct smooth and sudden phases",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "lift",
        "label": "Lift height",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 5,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "dwell",
        "label": "High-position dwell",
        "kind": "range",
        "default": 0.25,
        "min": 0,
        "max": 0.6,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 78,
    "id": "expansion.piston-bank",
    "name": "Piston Bank",
    "family": "Mechanical motion",
    "description": "The scripted meter renderer gains compression, return strokes, and alternating phase groups",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "banks",
        "label": "Phase groups",
        "kind": "range",
        "default": 2,
        "min": 2,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "compression",
        "label": "Compression fraction",
        "kind": "range",
        "default": 0.3,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 79,
    "id": "expansion.dwell-drive",
    "name": "Dwell Drive",
    "family": "Mechanical motion",
    "description": "A rotating mechanism spends most of its cycle stationary, then quickly advances to its next position",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "indices",
        "label": "Index positions",
        "kind": "range",
        "default": 6,
        "min": 3,
        "max": 12,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "transfer",
        "label": "Transfer fraction",
        "kind": "range",
        "default": 0.2,
        "min": 0.1,
        "max": 0.6,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 80,
    "id": "expansion.spring-lattice",
    "name": "Spring Lattice",
    "family": "Mechanical motion",
    "description": "Connected points tug on their neighbors after a disturbance, producing damped traveling motion",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "stiffness",
        "label": "Spring stiffness",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 20,
        "step": 1,
        "unit": "coefficient"
      },
      {
        "id": "damping",
        "label": "Velocity damping",
        "kind": "range",
        "default": 0.88,
        "min": 0.6,
        "max": 0.99,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 81,
    "id": "expansion.magnetic-clutch",
    "name": "Magnetic Clutch",
    "family": "Mechanical motion",
    "description": "Two rotating patterns drift independently, briefly lock together, then slip apart",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "coupling",
        "label": "Coupling strength",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "engagement",
        "label": "Engagement duration",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 82,
    "id": "expansion.hydraulic-network",
    "name": "Hydraulic Network",
    "family": "Mechanical motion",
    "description": "Pressure fills connected channels, opens threshold gates, and drains through another route",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "pressure",
        "label": "Input pressure",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 1.5,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "threshold",
        "label": "Valve threshold",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 83,
    "id": "expansion.differential-motion",
    "name": "Differential Motion",
    "family": "Mechanical motion",
    "description": "Two side-by-side motions change speed relative to a shared input while preserving their average speed",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "split",
        "label": "Speed difference",
        "kind": "range",
        "default": 0.5,
        "min": -1,
        "max": 1,
        "step": 0.1,
        "unit": "ratio"
      },
      {
        "id": "coupling",
        "label": "Split modulation",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 84,
    "id": "expansion.kinetic-tiles",
    "name": "Kinetic Tiles",
    "family": "Mechanical motion",
    "description": "The checker pattern gains a tile-flip illusion with a moving line of narrow bright edges",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "offset",
        "label": "Wave offset",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "edgeWidth",
        "label": "Edge-on width",
        "kind": "range",
        "default": 0.12,
        "min": 0.03,
        "max": 0.3,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 85,
    "id": "expansion.truchet-paths",
    "name": "Truchet Paths",
    "family": "Generative geometry",
    "description": "Rotating arc tiles join into continuously changing paths and closed loops across a hidden grid",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "tileSize",
        "label": "Tile size",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 4,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "turnInterval",
        "label": "Tile-turn interval",
        "kind": "range",
        "default": 1.2,
        "min": 0.3,
        "max": 5,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 86,
    "id": "expansion.hilbert-walk",
    "name": "Hilbert Walk",
    "family": "Generative geometry",
    "description": "A light follows a recursively folded path that visits the surface in a compact, space-filling order",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "order",
        "label": "Path order",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 5,
        "step": 1,
        "unit": "level"
      },
      {
        "id": "tail",
        "label": "Tail fraction",
        "kind": "range",
        "default": 0.15,
        "min": 0.02,
        "max": 0.5,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 87,
    "id": "expansion.peano-weave",
    "name": "Peano Weave",
    "family": "Generative geometry",
    "description": "A different recursive traversal builds dense nested turns, with several colored walkers separated along�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "order",
        "label": "Subdivision order",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 3,
        "step": 1,
        "unit": "level"
      },
      {
        "id": "walkers",
        "label": "Walker count",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 88,
    "id": "expansion.cell-fracture",
    "name": "Cell Fracture",
    "family": "Generative geometry",
    "description": "Existing cell regions split into smaller regions along moving seams and gradually merge again",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "depth",
        "label": "Subdivision depth",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 4,
        "step": 1,
        "unit": "level"
      },
      {
        "id": "split",
        "label": "Split cycle",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 30,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 89,
    "id": "expansion.triangulated-mesh",
    "name": "Triangulated Mesh",
    "family": "Generative geometry",
    "description": "Moving points form a network of triangle edges; bright edges change when the neighborhood connections change",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "points",
        "label": "Mesh points",
        "kind": "range",
        "default": 12,
        "min": 4,
        "max": 30,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "edgeFade",
        "label": "Changed-edge fade",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 90,
    "id": "expansion.quasiperiodic-tiles",
    "name": "Quasiperiodic Tiles",
    "family": "Generative geometry",
    "description": "Broad angular shapes drift through a non-repeating arrangement with a small set of repeating angles",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "scale",
        "label": "Tile scale",
        "kind": "range",
        "default": 1.5,
        "min": 0.5,
        "max": 4,
        "step": 0.25,
        "unit": "u"
      },
      {
        "id": "rotation",
        "label": "Patch angle",
        "kind": "range",
        "default": 0,
        "min": -180,
        "max": 180,
        "step": 5,
        "unit": "degrees"
      }
    ]
  },
  {
    "number": 91,
    "id": "expansion.superformula-morph",
    "name": "Superformula Morph",
    "family": "Generative geometry",
    "description": "One outline continuously changes between rounded, lobed, and star-like forms",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "lobes",
        "label": "Lobe count",
        "kind": "range",
        "default": 5,
        "min": 2,
        "max": 10,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "roundness",
        "label": "Shape roundness",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 92,
    "id": "expansion.harmonic-knots",
    "name": "Harmonic Knots",
    "family": "Generative geometry",
    "description": "Several curved strands overlap with alternating bright and dim crossings to suggest woven depth",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "strands",
        "label": "Strand count",
        "kind": "range",
        "default": 3,
        "min": 2,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "width",
        "label": "Strand width",
        "kind": "range",
        "default": 0.25,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 93,
    "id": "expansion.distance-sculptures",
    "name": "Distance Sculptures",
    "family": "Generative geometry",
    "description": "Soft unions and cutouts combine moving circles, bars, and capsules into changing silhouettes",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "softness",
        "label": "Union softness",
        "kind": "range",
        "default": 0.5,
        "min": 0.05,
        "max": 2,
        "step": 0.05,
        "unit": "u"
      },
      {
        "id": "primitives",
        "label": "Primitive count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 94,
    "id": "expansion.topographic-contours",
    "name": "Topographic Contours",
    "family": "Generative geometry",
    "description": "Only selected elevation bands of a changing virtual terrain are lit, forming moving contour lines",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "bands",
        "label": "Contour count",
        "kind": "range",
        "default": 6,
        "min": 2,
        "max": 14,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "width",
        "label": "Contour width",
        "kind": "range",
        "default": 0.08,
        "min": 0.02,
        "max": 0.25,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 95,
    "id": "expansion.quadtree-bloom",
    "name": "Quadtree Bloom",
    "family": "Generative geometry",
    "description": "Large regions subdivide into smaller blocks in response to a slowly moving detail field",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "depth",
        "label": "Maximum depth",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 5,
        "step": 1,
        "unit": "level"
      },
      {
        "id": "threshold",
        "label": "Detail threshold",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 96,
    "id": "expansion.aperiodic-weave",
    "name": "Aperiodic Weave",
    "family": "Generative geometry",
    "description": "Two changing stripe systems cross with different spacing and phase, producing a woven pattern without a�",
    "runtime": "procedural-animation",
    "controls": [
      {
        "id": "spacing",
        "label": "Primary spacing",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 5,
        "step": 0.25,
        "unit": "u"
      },
      {
        "id": "ratio",
        "label": "Secondary spacing ratio",
        "kind": "range",
        "default": 1.414,
        "min": 1.1,
        "max": 2.2,
        "step": 0.001,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 97,
    "id": "expansion.maze-carver",
    "name": "Maze Carver",
    "family": "Tiny procedural worlds",
    "description": "A moving point builds a maze one passage at a time, leaving its active frontier bright",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "width",
        "label": "Virtual maze columns",
        "kind": "range",
        "default": 16,
        "min": 4,
        "max": 32,
        "step": 2,
        "unit": "cells"
      },
      {
        "id": "carveRate",
        "label": "Carving steps",
        "kind": "range",
        "default": 8,
        "min": 1,
        "max": 30,
        "step": 1,
        "unit": "Hz"
      }
    ]
  },
  {
    "number": 98,
    "id": "expansion.maze-search",
    "name": "Maze Search",
    "family": "Tiny procedural worlds",
    "description": "The same maze is explored outward from a start point before its final route is highlighted",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "searchRate",
        "label": "Search steps",
        "kind": "range",
        "default": 10,
        "min": 1,
        "max": 40,
        "step": 1,
        "unit": "Hz"
      },
      {
        "id": "routeHold",
        "label": "Solution hold",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 10,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 99,
    "id": "expansion.courier-network",
    "name": "Courier Network",
    "family": "Tiny procedural worlds",
    "description": "Moving lights choose paths between changing destinations and leave short traces of completed deliveries",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "couriers",
        "label": "Courier count",
        "kind": "range",
        "default": 5,
        "min": 1,
        "max": 16,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "trace",
        "label": "Delivery trace",
        "kind": "range",
        "default": 1.5,
        "min": 0.2,
        "max": 6,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 100,
    "id": "expansion.packet-switching",
    "name": "Packet Switching",
    "family": "Tiny procedural worlds",
    "description": "Packets split across alternate routes when one route is busy, then rejoin at a destination",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "packets",
        "label": "Packet cap",
        "kind": "range",
        "default": 24,
        "min": 6,
        "max": 60,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "capacity",
        "label": "Edge capacity",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 6,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 101,
    "id": "expansion.railway-signals",
    "name": "Railway Signals",
    "family": "Tiny procedural worlds",
    "description": "Small trains wait at colored signals and proceed through shared sections when a route clears",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "trains",
        "label": "Train count",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "signalHold",
        "label": "Signal dwell",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 5,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 102,
    "id": "expansion.continuity-tester",
    "name": "Continuity Tester",
    "family": "Tiny procedural worlds",
    "description": "A scanning signal tests different circuit branches and marks completed, open, and reconnecting routes",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "faults",
        "label": "Open connections",
        "kind": "range",
        "default": 2,
        "min": 0,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "scanRate",
        "label": "Probe speed",
        "kind": "range",
        "default": 5,
        "min": 1,
        "max": 15,
        "step": 1,
        "unit": "edges/s"
      }
    ]
  },
  {
    "number": 103,
    "id": "expansion.elevator-dispatch",
    "name": "Elevator Dispatch",
    "family": "Tiny procedural worlds",
    "description": "Small vertical lights stop at requested rows, pause, and reverse direction as new requests appear",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "cars",
        "label": "Elevator cars",
        "kind": "range",
        "default": 2,
        "min": 1,
        "max": 4,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "dwell",
        "label": "Stop dwell",
        "kind": "range",
        "default": 0.8,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 104,
    "id": "expansion.city-nightfall",
    "name": "City Nightfall",
    "family": "Tiny procedural worlds",
    "description": "Blocks of warm windows turn on in clusters, quiet down, and wake again on a slow district-by-district schedule",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "districts",
        "label": "District count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "cycle",
        "label": "Night cycle",
        "kind": "range",
        "default": 40,
        "min": 10,
        "max": 180,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 105,
    "id": "expansion.factory-shift",
    "name": "Factory Shift",
    "family": "Tiny procedural worlds",
    "description": "Colored pieces move through processing stations, change color, and exit as a synchronized production line",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "stations",
        "label": "Processing stages",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "processing",
        "label": "Processing dwell",
        "kind": "range",
        "default": 0.7,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 106,
    "id": "expansion.growing-skyline",
    "name": "Growing Skyline",
    "family": "Tiny procedural worlds",
    "description": "Small column groups build up to different heights, reset locally, and continue rebuilding while other�",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "blocks",
        "label": "Building groups",
        "kind": "range",
        "default": 8,
        "min": 3,
        "max": 16,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "buildRate",
        "label": "Build pace",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 4,
        "step": 0.2,
        "unit": "levels/s"
      }
    ]
  },
  {
    "number": 107,
    "id": "expansion.power-grid-startup",
    "name": "Power Grid Startup",
    "family": "Tiny procedural worlds",
    "description": "A few hubs power up first, then light spreads along their dependent branches in a deliberate sequence",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "hubs",
        "label": "Power hubs",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 6,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "delay",
        "label": "Branch startup delay",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 108,
    "id": "expansion.signal-hunt",
    "name": "Signal Hunt",
    "family": "Tiny procedural worlds",
    "description": "A moving search sweeps broad regions, narrows around a hidden source, and marks a brief successful lock",
    "runtime": "stateful-animation",
    "controls": [
      {
        "id": "sectors",
        "label": "Initial sectors",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 8,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "lockHold",
        "label": "Lock duration",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 8,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 109,
    "id": "expansion.compression-wake",
    "name": "Compression Wake",
    "family": "Typing as physics",
    "description": "A press compresses surrounding light away from the key, then the field eases back into place",
    "runtime": "typing",
    "controls": [
      {
        "id": "impulse",
        "label": "Compression impulse",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "recovery",
        "label": "Recovery damping",
        "kind": "range",
        "default": 0.85,
        "min": 0.5,
        "max": 0.98,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 110,
    "id": "expansion.duration-brush",
    "name": "Duration Brush",
    "family": "Typing as physics",
    "description": "Successive key positions draw a continuous paint stroke whose width responds to hold duration, not�",
    "runtime": "typing",
    "controls": [
      {
        "id": "minWidth",
        "label": "Minimum stroke",
        "kind": "range",
        "default": 0.15,
        "min": 0.05,
        "max": 0.5,
        "step": 0.05,
        "unit": "u"
      },
      {
        "id": "holdScale",
        "label": "Hold-to-width gain",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "u/s"
      }
    ]
  },
  {
    "number": 111,
    "id": "expansion.foam-puncture",
    "name": "Foam Puncture",
    "family": "Typing as physics",
    "description": "Pressing a key pops a nearby bubble in a persistent foam field; adjacent bubbles expand into the opening",
    "runtime": "typing",
    "controls": [
      {
        "id": "popRadius",
        "label": "Interaction radius",
        "kind": "range",
        "default": 1,
        "min": 0.3,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "healing",
        "label": "Healing time",
        "kind": "range",
        "default": 2.5,
        "min": 0.5,
        "max": 10,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 112,
    "id": "expansion.particle-brush",
    "name": "Particle Brush",
    "family": "Typing as physics",
    "description": "Each press nudges particles that already exist, leaving motion that continues between keystrokes",
    "runtime": "typing",
    "controls": [
      {
        "id": "count",
        "label": "Particle count",
        "kind": "range",
        "default": 40,
        "min": 10,
        "max": 100,
        "step": 5,
        "unit": "count"
      },
      {
        "id": "impulse",
        "label": "Press impulse",
        "kind": "range",
        "default": 1.5,
        "min": 0.2,
        "max": 5,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 113,
    "id": "expansion.resonant-membrane",
    "name": "Resonant Membrane",
    "family": "Typing as physics",
    "description": "Every press excites a connected surface; multiple presses interact as traveling deformations",
    "runtime": "typing",
    "controls": [
      {
        "id": "stiffness",
        "label": "Surface stiffness",
        "kind": "range",
        "default": 10,
        "min": 2,
        "max": 24,
        "step": 1,
        "unit": "coefficient"
      },
      {
        "id": "impulse",
        "label": "Key energy",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 114,
    "id": "expansion.domino-run",
    "name": "Domino Run",
    "family": "Typing as physics",
    "description": "A press starts a directional run of falling-light tiles; the previous key determines the starting direction",
    "runtime": "typing",
    "controls": [
      {
        "id": "spacing",
        "label": "Topple delay",
        "kind": "range",
        "default": 0.08,
        "min": 0.02,
        "max": 0.3,
        "step": 0.01,
        "unit": "s"
      },
      {
        "id": "length",
        "label": "Maximum run",
        "kind": "range",
        "default": 12,
        "min": 2,
        "max": 30,
        "step": 1,
        "unit": "keys"
      }
    ]
  },
  {
    "number": 115,
    "id": "expansion.dipole-touch",
    "name": "Dipole Touch",
    "family": "Typing as physics",
    "description": "Held keys become positive or negative sources, so nearby regions cancel or reinforce depending on the chord",
    "runtime": "typing",
    "controls": [
      {
        "id": "reach",
        "label": "Field reach",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 10,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "release",
        "label": "Release decay",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 116,
    "id": "expansion.shock-absorber",
    "name": "Shock Absorber",
    "family": "Typing as physics",
    "description": "Each key has a spring-like brightness response; faster bursts compress the field before it rebounds",
    "runtime": "typing",
    "controls": [
      {
        "id": "stiffness",
        "label": "Response stiffness",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 20,
        "step": 1,
        "unit": "coefficient"
      },
      {
        "id": "damping",
        "label": "Response damping",
        "kind": "range",
        "default": 0.85,
        "min": 0.5,
        "max": 0.98,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 117,
    "id": "expansion.touch-lens",
    "name": "Touch Lens",
    "family": "Typing as physics",
    "description": "Pressing a key locally distorts a selected background animation, and releasing lets the distortion relax",
    "runtime": "typing",
    "controls": [
      {
        "id": "radius",
        "label": "Touch radius",
        "kind": "range",
        "default": 1.8,
        "min": 0.5,
        "max": 5,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "release",
        "label": "Relaxation time",
        "kind": "range",
        "default": 0.6,
        "min": 0.1,
        "max": 3,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 118,
    "id": "expansion.turbulent-typing-wake",
    "name": "Turbulent Typing Wake",
    "family": "Typing as physics",
    "description": "The direction between consecutive keys injects a small vortex into a persistent field rather than a�",
    "runtime": "typing",
    "controls": [
      {
        "id": "vorticity",
        "label": "Wake rotation",
        "kind": "range",
        "default": 1,
        "min": 0.1,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "decay",
        "label": "Wake lifetime",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 10,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 119,
    "id": "expansion.colliding-sparks",
    "name": "Colliding Sparks",
    "family": "Typing as physics",
    "description": "Presses launch particles that bounce off earlier particles and the edges of the layout",
    "runtime": "typing",
    "controls": [
      {
        "id": "perPress",
        "label": "Sparks per press",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "restitution",
        "label": "Bounce retention",
        "kind": "range",
        "default": 0.7,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 120,
    "id": "expansion.ballistic-release",
    "name": "Ballistic Release",
    "family": "Typing as physics",
    "description": "Release particles inherit a direction from the typing path and launch speed from hold duration",
    "runtime": "typing",
    "controls": [
      {
        "id": "speed",
        "label": "Base launch speed",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 0.5,
        "unit": "units/s"
      },
      {
        "id": "holdGain",
        "label": "Hold speed gain",
        "kind": "range",
        "default": 2,
        "min": 0,
        "max": 6,
        "step": 0.5,
        "unit": "units/s"
      }
    ]
  },
  {
    "number": 121,
    "id": "expansion.tension-net",
    "name": "Tension Net",
    "family": "Chords and relationships",
    "description": "Held keys become anchors of an elastic mesh that visibly relaxes when one anchor is released",
    "runtime": "typing",
    "controls": [
      {
        "id": "stiffness",
        "label": "Net stiffness",
        "kind": "range",
        "default": 10,
        "min": 2,
        "max": 24,
        "step": 1,
        "unit": "coefficient"
      },
      {
        "id": "damping",
        "label": "Net damping",
        "kind": "range",
        "default": 0.86,
        "min": 0.5,
        "max": 0.98,
        "step": 0.01,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 122,
    "id": "expansion.soap-film-chord",
    "name": "Soap-Film Chord",
    "family": "Chords and relationships",
    "description": "The existing held-key hull gains a soft, bowed surface whose brightness concentrates near stretched edges",
    "runtime": "typing",
    "controls": [
      {
        "id": "bow",
        "label": "Surface bow",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1.5,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "edge",
        "label": "Edge emphasis",
        "kind": "range",
        "default": 0.7,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 123,
    "id": "expansion.chord-arpeggio",
    "name": "Chord Arpeggio",
    "family": "Chords and relationships",
    "description": "Light visits the currently held keys in order, then continues along the connecting paths",
    "runtime": "typing",
    "controls": [
      {
        "id": "tempo",
        "label": "Visits per second",
        "kind": "range",
        "default": 4,
        "min": 0.5,
        "max": 12,
        "step": 0.5,
        "unit": "Hz"
      },
      {
        "id": "tail",
        "label": "Pulse tail",
        "kind": "range",
        "default": 0.3,
        "min": 0.05,
        "max": 1.5,
        "step": 0.05,
        "unit": "s"
      }
    ]
  },
  {
    "number": 124,
    "id": "expansion.chord-polyrhythm",
    "name": "Chord Polyrhythm",
    "family": "Chords and relationships",
    "description": "Each held key owns a different pulse period, producing repeating moments of alignment across the chord",
    "runtime": "typing",
    "controls": [
      {
        "id": "basePeriod",
        "label": "Base period",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 4,
        "step": 0.1,
        "unit": "s"
      },
      {
        "id": "spread",
        "label": "Period spread",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 6,
        "step": 1,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 125,
    "id": "expansion.phase-agreement",
    "name": "Phase Agreement",
    "family": "Chords and relationships",
    "description": "Held-key oscillators start with different phases and gradually synchronize through their shared connections",
    "runtime": "typing",
    "controls": [
      {
        "id": "coupling",
        "label": "Phase coupling",
        "kind": "range",
        "default": 0.8,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "frequency",
        "label": "Base pulse rate",
        "kind": "range",
        "default": 1.5,
        "min": 0.3,
        "max": 5,
        "step": 0.1,
        "unit": "Hz"
      }
    ]
  },
  {
    "number": 126,
    "id": "expansion.color-treaty",
    "name": "Color Treaty",
    "family": "Chords and relationships",
    "description": "Held sources divide a blended field into territories; changing the chord moves the boundaries rather than�",
    "runtime": "typing",
    "controls": [
      {
        "id": "softness",
        "label": "Boundary softness",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "u"
      },
      {
        "id": "settling",
        "label": "Boundary settling",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 127,
    "id": "expansion.elastic-perimeter",
    "name": "Elastic Perimeter",
    "family": "Chords and relationships",
    "description": "A band stretches around held keys, vibrates on a new press, and snaps into a smaller loop on release",
    "runtime": "typing",
    "controls": [
      {
        "id": "tension",
        "label": "Band tension",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "decay",
        "label": "Vibration decay",
        "kind": "range",
        "default": 1.5,
        "min": 0.2,
        "max": 5,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 128,
    "id": "expansion.chord-interferometer",
    "name": "Chord Interferometer",
    "family": "Chords and relationships",
    "description": "Held sources drive the existing interference effect continuously; changing hold length changes their phase",
    "runtime": "typing",
    "controls": [
      {
        "id": "frequency",
        "label": "Wave frequency",
        "kind": "range",
        "default": 1.5,
        "min": 0.3,
        "max": 4,
        "step": 0.1,
        "unit": "cycles/u"
      },
      {
        "id": "phaseGain",
        "label": "Hold phase gain",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 2,
        "step": 0.1,
        "unit": "turns/s"
      }
    ]
  },
  {
    "number": 129,
    "id": "expansion.braided-hands",
    "name": "Braided Hands",
    "family": "Chords and relationships",
    "description": "Left-side and right-side key sequences draw independent strands that interweave where their paths cross",
    "runtime": "typing",
    "controls": [
      {
        "id": "history",
        "label": "Keys per strand",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 30,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "width",
        "label": "Strand width",
        "kind": "range",
        "default": 0.25,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "u"
      }
    ]
  },
  {
    "number": 130,
    "id": "expansion.shortcut-confirmation",
    "name": "Shortcut Confirmation",
    "family": "Chords and relationships",
    "description": "A brief visual signature acknowledges a recognized shortcut using the active application’s shortcut map",
    "runtime": "host-event",
    "controls": [
      {
        "id": "duration",
        "label": "Confirmation duration",
        "kind": "range",
        "default": 0.7,
        "min": 0.2,
        "max": 3,
        "step": 0.1,
        "unit": "s"
      },
      {
        "id": "radius",
        "label": "Confirmation reach",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 6,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 131,
    "id": "expansion.chord-orbitals",
    "name": "Chord Orbitals",
    "family": "Chords and relationships",
    "description": "A small moving light responds to all held keys as attractors; releasing one changes its route smoothly",
    "runtime": "typing",
    "controls": [
      {
        "id": "tracers",
        "label": "Tracer count",
        "kind": "range",
        "default": 5,
        "min": 1,
        "max": 16,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "attraction",
        "label": "Anchor attraction",
        "kind": "range",
        "default": 1,
        "min": 0.1,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 132,
    "id": "expansion.release-compass",
    "name": "Release Compass",
    "family": "Chords and relationships",
    "description": "A chord sets a direction and releasing its last key launches the existing directional sweep along that�",
    "runtime": "typing",
    "controls": [
      {
        "id": "reach",
        "label": "Sweep reach",
        "kind": "range",
        "default": 10,
        "min": 2,
        "max": 24,
        "step": 1,
        "unit": "u"
      },
      {
        "id": "speed",
        "label": "Sweep speed",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 30,
        "step": 1,
        "unit": "units/s"
      }
    ]
  },
  {
    "number": 133,
    "id": "expansion.trail-excavation",
    "name": "Trail Excavation",
    "family": "Memory and adaptation",
    "description": "Typing repeatedly along a path cuts a glowing channel into a soft field; unused channels slowly fill back in",
    "runtime": "typing",
    "controls": [
      {
        "id": "depth",
        "label": "Excavation per transition",
        "kind": "range",
        "default": 0.12,
        "min": 0.02,
        "max": 0.4,
        "step": 0.02,
        "unit": "ratio"
      },
      {
        "id": "recovery",
        "label": "Recovery time",
        "kind": "range",
        "default": 30,
        "min": 5,
        "max": 120,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 134,
    "id": "expansion.activity-districts",
    "name": "Activity Districts",
    "family": "Memory and adaptation",
    "description": "Frequently used clusters become coherent regions with changing outlines, rather than independent hot keys",
    "runtime": "typing",
    "controls": [
      {
        "id": "window",
        "label": "Activity window",
        "kind": "range",
        "default": 30,
        "min": 5,
        "max": 120,
        "step": 5,
        "unit": "s"
      },
      {
        "id": "threshold",
        "label": "District threshold",
        "kind": "range",
        "default": 0.35,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 135,
    "id": "expansion.palette-inheritance",
    "name": "Palette Inheritance",
    "family": "Memory and adaptation",
    "description": "New key activity mixes its color with nearby recent activity, producing locally inherited color families",
    "runtime": "typing",
    "controls": [
      {
        "id": "inheritance",
        "label": "Neighbor inheritance",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "memory",
        "label": "Color memory",
        "kind": "range",
        "default": 20,
        "min": 3,
        "max": 90,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 136,
    "id": "expansion.learned-footpaths",
    "name": "Learned Footpaths",
    "family": "Memory and adaptation",
    "description": "Repeated key transitions gradually thicken and brighten the existing pair connections",
    "runtime": "typing",
    "controls": [
      {
        "id": "window",
        "label": "Transition memory",
        "kind": "range",
        "default": 45,
        "min": 10,
        "max": 180,
        "step": 5,
        "unit": "s"
      },
      {
        "id": "gain",
        "label": "Repetition gain",
        "kind": "range",
        "default": 0.3,
        "min": 0.05,
        "max": 1,
        "step": 0.05,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 137,
    "id": "expansion.recency-ribbons",
    "name": "Recency Ribbons",
    "family": "Memory and adaptation",
    "description": "Recent bursts become bands that move across the board in chronological order, with older bursts fading�",
    "runtime": "typing",
    "controls": [
      {
        "id": "window",
        "label": "Ribbon history",
        "kind": "range",
        "default": 12,
        "min": 3,
        "max": 45,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "bucket",
        "label": "Burst bucket width",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 138,
    "id": "expansion.entropy-landscape",
    "name": "Entropy Landscape",
    "family": "Memory and adaptation",
    "description": "Regions change character according to how varied their recent key activity is, rather than only how�",
    "runtime": "typing",
    "controls": [
      {
        "id": "window",
        "label": "Diversity window",
        "kind": "range",
        "default": 30,
        "min": 5,
        "max": 120,
        "step": 5,
        "unit": "s"
      },
      {
        "id": "smoothing",
        "label": "Spatial smoothing",
        "kind": "range",
        "default": 1.5,
        "min": 0.2,
        "max": 4,
        "step": 0.1,
        "unit": "u"
      }
    ]
  },
  {
    "number": 139,
    "id": "expansion.habit-contours",
    "name": "Habit Contours",
    "family": "Memory and adaptation",
    "description": "The existing usage heat map gains soft contour lines around similarly active regions",
    "runtime": "typing",
    "controls": [
      {
        "id": "bands",
        "label": "Usage contour count",
        "kind": "range",
        "default": 4,
        "min": 2,
        "max": 10,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "window",
        "label": "Usage window",
        "kind": "range",
        "default": 40,
        "min": 10,
        "max": 120,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 140,
    "id": "expansion.two-time-memory",
    "name": "Two-Time Memory",
    "family": "Memory and adaptation",
    "description": "One color represents very recent activity and another represents the longer trend; changing habits shifts�",
    "runtime": "typing",
    "controls": [
      {
        "id": "short",
        "label": "Recent memory",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 10,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "long",
        "label": "Trend memory",
        "kind": "range",
        "default": 30,
        "min": 10,
        "max": 120,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 141,
    "id": "expansion.session-seasons",
    "name": "Session Seasons",
    "family": "Memory and adaptation",
    "description": "A long scene moves through distinct phases based on elapsed session time and recent activity",
    "runtime": "scene",
    "controls": [
      {
        "id": "cycle",
        "label": "Nominal session cycle",
        "kind": "range",
        "default": 300,
        "min": 60,
        "max": 1800,
        "step": 30,
        "unit": "s"
      },
      {
        "id": "activityGain",
        "label": "Activity influence",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 142,
    "id": "expansion.afterwork-rain",
    "name": "Afterwork Rain",
    "family": "Memory and adaptation",
    "description": "Typing feeds a soft cloud layer; after a pause, accumulated light falls away as gentle rain",
    "runtime": "scene",
    "controls": [
      {
        "id": "idleDelay",
        "label": "Rain-start delay",
        "kind": "range",
        "default": 3,
        "min": 1,
        "max": 15,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "capacity",
        "label": "Stored cloud energy",
        "kind": "range",
        "default": 40,
        "min": 5,
        "max": 120,
        "step": 5,
        "unit": "events"
      }
    ]
  },
  {
    "number": 143,
    "id": "expansion.recovering-reef",
    "name": "Recovering Reef",
    "family": "Memory and adaptation",
    "description": "The existing per-key recharge mechanic becomes a connected reef that recovers outward from rested neighbors",
    "runtime": "typing",
    "controls": [
      {
        "id": "recovery",
        "label": "Baseline recovery",
        "kind": "range",
        "default": 20,
        "min": 3,
        "max": 90,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "neighborGain",
        "label": "Neighbor regrowth",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 144,
    "id": "expansion.recurring-constellations",
    "name": "Recurring Constellations",
    "family": "Memory and adaptation",
    "description": "Frequently repeated groups of keys gradually form stable constellations that dissolve when the usage�",
    "runtime": "typing",
    "controls": [
      {
        "id": "window",
        "label": "Group memory",
        "kind": "range",
        "default": 60,
        "min": 10,
        "max": 180,
        "step": 5,
        "unit": "s"
      },
      {
        "id": "repetitions",
        "label": "Group threshold",
        "kind": "range",
        "default": 3,
        "min": 2,
        "max": 10,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 145,
    "id": "expansion.stereo-separation",
    "name": "Stereo Separation",
    "family": "Music and sound",
    "description": "Left and right audio energy independently illuminate opposite sides of the keyboard",
    "runtime": "audio",
    "controls": [
      {
        "id": "separation",
        "label": "Stereo separation",
        "kind": "range",
        "default": 1,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "smoothing",
        "label": "Envelope retention",
        "kind": "range",
        "default": 0.65,
        "min": 0,
        "max": 0.95,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 146,
    "id": "expansion.bass-lens",
    "name": "Bass Lens",
    "family": "Music and sound",
    "description": "Low-frequency energy expands and contracts a lens that warps a selected background effect",
    "runtime": "audio",
    "controls": [
      {
        "id": "depth",
        "label": "Bass distortion",
        "kind": "range",
        "default": 1,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      },
      {
        "id": "radius",
        "label": "Maximum lens reach",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 8,
        "step": 0.5,
        "unit": "u"
      }
    ]
  },
  {
    "number": 147,
    "id": "expansion.transient-raindrops",
    "name": "Transient Raindrops",
    "family": "Music and sound",
    "description": "Sharp onsets launch falling droplets from positions chosen by the frequency band that changed",
    "runtime": "audio",
    "controls": [
      {
        "id": "threshold",
        "label": "Onset threshold",
        "kind": "range",
        "default": 0.2,
        "min": 0.05,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "cooldown",
        "label": "Per-band cooldown",
        "kind": "range",
        "default": 0.15,
        "min": 0.05,
        "max": 0.8,
        "step": 0.05,
        "unit": "s"
      }
    ]
  },
  {
    "number": 148,
    "id": "expansion.harmonic-ladder",
    "name": "Harmonic Ladder",
    "family": "Music and sound",
    "description": "Detected pitch classes light different zones, with color persistence showing recent note changes",
    "runtime": "audio",
    "controls": [
      {
        "id": "confidence",
        "label": "Pitch confidence",
        "kind": "range",
        "default": 0.7,
        "min": 0.3,
        "max": 0.95,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "hold",
        "label": "Pitch trail",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 4,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 149,
    "id": "expansion.onset-racetrack",
    "name": "Onset Racetrack",
    "family": "Music and sound",
    "description": "Detected transients launch runners along a closed route; close hits create a visible convoy",
    "runtime": "audio",
    "controls": [
      {
        "id": "speed",
        "label": "Runner speed",
        "kind": "range",
        "default": 12,
        "min": 2,
        "max": 30,
        "step": 1,
        "unit": "keys/s"
      },
      {
        "id": "tail",
        "label": "Runner tail",
        "kind": "range",
        "default": 6,
        "min": 1,
        "max": 20,
        "step": 1,
        "unit": "keys"
      }
    ]
  },
  {
    "number": 150,
    "id": "expansion.centroid-orbit",
    "name": "Centroid Orbit",
    "family": "Music and sound",
    "description": "A sound’s spectral balance moves a light source across the board while loudness controls its orbit size",
    "runtime": "audio",
    "controls": [
      {
        "id": "radius",
        "label": "Maximum orbit",
        "kind": "range",
        "default": 3,
        "min": 0.5,
        "max": 7,
        "step": 0.5,
        "unit": "u"
      },
      {
        "id": "response",
        "label": "Input response time",
        "kind": "range",
        "default": 0.25,
        "min": 0.05,
        "max": 1.5,
        "step": 0.05,
        "unit": "s"
      }
    ]
  },
  {
    "number": 151,
    "id": "expansion.beat-pendulum",
    "name": "Beat Pendulum",
    "family": "Music and sound",
    "description": "A pendulum follows an estimated musical beat and adjusts gradually when the timing drifts",
    "runtime": "audio",
    "controls": [
      {
        "id": "confidence",
        "label": "Beat confidence floor",
        "kind": "range",
        "default": 0.65,
        "min": 0.3,
        "max": 0.95,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "correction",
        "label": "Phase-correction strength",
        "kind": "range",
        "default": 0.2,
        "min": 0.05,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 152,
    "id": "expansion.polyrhythm-bands",
    "name": "Polyrhythm Bands",
    "family": "Music and sound",
    "description": "Different frequency ranges maintain independent onset-driven pulse trains that occasionally align",
    "runtime": "audio",
    "controls": [
      {
        "id": "window",
        "label": "Band history",
        "kind": "range",
        "default": 8,
        "min": 2,
        "max": 20,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "tail",
        "label": "Pulse trail",
        "kind": "range",
        "default": 0.5,
        "min": 0.1,
        "max": 2,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 153,
    "id": "expansion.quiet-bloom",
    "name": "Quiet Bloom",
    "family": "Music and sound",
    "description": "During an active audio session, quiet passages expand dim soft blooms that retreat as the sound grows louder",
    "runtime": "audio",
    "controls": [
      {
        "id": "quiet",
        "label": "Quiet threshold",
        "kind": "range",
        "default": 0.12,
        "min": 0.02,
        "max": 0.4,
        "step": 0.02,
        "unit": "ratio"
      },
      {
        "id": "growth",
        "label": "Bloom response",
        "kind": "range",
        "default": 2,
        "min": 0.3,
        "max": 6,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 154,
    "id": "expansion.spectral-memory",
    "name": "Spectral Memory",
    "family": "Music and sound",
    "description": "A scrolling time-frequency image shows which bands were active over the last few seconds",
    "runtime": "audio",
    "controls": [
      {
        "id": "history",
        "label": "Visible history",
        "kind": "range",
        "default": 6,
        "min": 1,
        "max": 20,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "contrast",
        "label": "Spectrum contrast",
        "kind": "range",
        "default": 1.4,
        "min": 0.5,
        "max": 3,
        "step": 0.1,
        "unit": "coefficient"
      }
    ]
  },
  {
    "number": 155,
    "id": "expansion.stereo-vortex",
    "name": "Stereo Vortex",
    "family": "Music and sound",
    "description": "Stereo balance turns a rotating field clockwise or counterclockwise while loudness controls its reach",
    "runtime": "audio",
    "controls": [
      {
        "id": "rotation",
        "label": "Maximum angular drive",
        "kind": "range",
        "default": 2,
        "min": 0.2,
        "max": 5,
        "step": 0.2,
        "unit": "coefficient"
      },
      {
        "id": "deadband",
        "label": "Center deadband",
        "kind": "range",
        "default": 0.08,
        "min": 0,
        "max": 0.3,
        "step": 0.02,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 156,
    "id": "expansion.build-and-drop",
    "name": "Build and Drop",
    "family": "Music and sound",
    "description": "A sustained rise in energy creates a slow buildup; a strong onset after that buildup releases a single�",
    "runtime": "audio",
    "controls": [
      {
        "id": "buildWindow",
        "label": "Buildup window",
        "kind": "range",
        "default": 5,
        "min": 2,
        "max": 12,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "cooldown",
        "label": "Drop cooldown",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 15,
        "step": 0.5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 157,
    "id": "expansion.glass-ocean",
    "name": "Glass Ocean",
    "family": "Layered scene recipes",
    "description": "Water caustics form the base, typing creates local refraction, and bass gently changes the water depth",
    "runtime": "scene",
    "controls": [
      {
        "id": "typingMix",
        "label": "Typing distortion mix",
        "kind": "range",
        "default": 0.45,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "bassMix",
        "label": "Bass influence",
        "kind": "range",
        "default": 0.2,
        "min": 0,
        "max": 0.6,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 158,
    "id": "expansion.copper-rain",
    "name": "Copper Rain",
    "family": "Layered scene recipes",
    "description": "Warm falling droplets pass over a dim metallic wash while typing leaves short amber accents",
    "runtime": "scene",
    "controls": [
      {
        "id": "rainMix",
        "label": "Rain amount",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "accent",
        "label": "Typing accent",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 159,
    "id": "expansion.night-drive",
    "name": "Night Drive",
    "family": "Layered scene recipes",
    "description": "A dark horizon moves slowly, audio transients create passing highlights, and typing bends a subtle light trail",
    "runtime": "scene",
    "controls": [
      {
        "id": "horizon",
        "label": "Horizon level",
        "kind": "range",
        "default": 0.55,
        "min": 0.1,
        "max": 0.9,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "trail",
        "label": "Trail amount",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 160,
    "id": "expansion.botanical-study",
    "name": "Botanical Study",
    "family": "Layered scene recipes",
    "description": "A slow mycelium network grows under drifting pollen, with new key activity blooming at connected tips",
    "runtime": "scene",
    "controls": [
      {
        "id": "pollen",
        "label": "Pollen amount",
        "kind": "range",
        "default": 0.35,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "bloom",
        "label": "Typing bloom gain",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 161,
    "id": "expansion.deep-laboratory",
    "name": "Deep Laboratory",
    "family": "Layered scene recipes",
    "description": "Reaction islands evolve slowly while typing adds brief disturbances and an occasional cool contour line�",
    "runtime": "scene",
    "controls": [
      {
        "id": "disturbance",
        "label": "Typing disturbance",
        "kind": "range",
        "default": 0.25,
        "min": 0,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "contours",
        "label": "Contour opacity",
        "kind": "range",
        "default": 0.2,
        "min": 0,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 162,
    "id": "expansion.quiet-reading-room",
    "name": "Quiet Reading Room",
    "family": "Layered scene recipes",
    "description": "A very dim warm base supports soft typing fades and a long idle transition with a shared brightness ceiling",
    "runtime": "scene",
    "controls": [
      {
        "id": "ceiling",
        "label": "Brightness ceiling",
        "kind": "range",
        "default": 0.25,
        "min": 0.05,
        "max": 0.5,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "idle",
        "label": "Idle dim delay",
        "kind": "range",
        "default": 30,
        "min": 5,
        "max": 180,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 163,
    "id": "expansion.arcade-afterhours",
    "name": "Arcade Afterhours",
    "family": "Layered scene recipes",
    "description": "A faint digital base runs under chord arpeggios and sparse, audio-driven particle accents",
    "runtime": "scene",
    "controls": [
      {
        "id": "digital",
        "label": "Digital base mix",
        "kind": "range",
        "default": 0.2,
        "min": 0,
        "max": 0.5,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "accent",
        "label": "Accent mix",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 164,
    "id": "expansion.arctic-radio",
    "name": "Arctic Radio",
    "family": "Layered scene recipes",
    "description": "Cold polarizer-like bands sit under a restrained spectral history and occasional keypress traces",
    "runtime": "scene",
    "controls": [
      {
        "id": "spectrum",
        "label": "Spectrum mix",
        "kind": "range",
        "default": 0.3,
        "min": 0,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "trace",
        "label": "Key-trace mix",
        "kind": "range",
        "default": 0.35,
        "min": 0,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 165,
    "id": "expansion.solar-forge",
    "name": "Solar Forge",
    "family": "Layered scene recipes",
    "description": "A rotating accretion field supports localized held-key heat, with a short burst when a charged key is released",
    "runtime": "scene",
    "controls": [
      {
        "id": "heat",
        "label": "Held heat gain",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "burst",
        "label": "Release burst amount",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 166,
    "id": "expansion.paper-lanterns",
    "name": "Paper Lanterns",
    "family": "Layered scene recipes",
    "description": "Separated warm pools glow at slightly different rhythms, respond softly to nearby typing, and dim�",
    "runtime": "scene",
    "controls": [
      {
        "id": "lanterns",
        "label": "Glow pools",
        "kind": "range",
        "default": 5,
        "min": 2,
        "max": 10,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "response",
        "label": "Typing response",
        "kind": "range",
        "default": 0.25,
        "min": 0,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 167,
    "id": "expansion.rain-on-glass",
    "name": "Rain on Glass",
    "family": "Layered scene recipes",
    "description": "Persistent droplets slide over a dark background while presses temporarily distort a small area around the key",
    "runtime": "scene",
    "controls": [
      {
        "id": "droplets",
        "label": "Droplet mix",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "touch",
        "label": "Touch distortion",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 168,
    "id": "expansion.living-circuit",
    "name": "Living Circuit",
    "family": "Layered scene recipes",
    "description": "A running circuit simulation accepts keystroke pulses, while optional build events briefly change the�",
    "runtime": "scene",
    "controls": [
      {
        "id": "injection",
        "label": "Key pulse amount",
        "kind": "range",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "eventMix",
        "label": "Build overlay mix",
        "kind": "range",
        "default": 0.4,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 169,
    "id": "expansion.build-runner",
    "name": "Build Runner",
    "family": "Useful event lighting",
    "description": "Actual build progress travels across a chosen route, ending in a brief success or failure pattern",
    "runtime": "host-event",
    "controls": [
      {
        "id": "resultHold",
        "label": "Result hold",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 8,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "trail",
        "label": "Progress trail",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 1,
        "unit": "keys"
      }
    ]
  },
  {
    "number": 170,
    "id": "expansion.test-lanes",
    "name": "Test Lanes",
    "family": "Useful event lighting",
    "description": "Groups of keys represent running test groups, then retain a short colored result summary",
    "runtime": "host-event",
    "controls": [
      {
        "id": "summaryHold",
        "label": "Result summary hold",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 15,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "lanes",
        "label": "Maximum lanes",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 8,
        "step": 1,
        "unit": "count"
      }
    ]
  },
  {
    "number": 171,
    "id": "expansion.download-channel",
    "name": "Download Channel",
    "family": "Useful event lighting",
    "description": "A chosen key row shows the progress of a real download or file transfer",
    "runtime": "host-event",
    "controls": [
      {
        "id": "hold",
        "label": "Completion hold",
        "kind": "range",
        "default": 2,
        "min": 0.5,
        "max": 8,
        "step": 0.5,
        "unit": "s"
      },
      {
        "id": "width",
        "label": "Reserved region",
        "kind": "range",
        "default": 0.25,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 172,
    "id": "expansion.meeting-mute",
    "name": "Meeting Mute",
    "family": "Useful event lighting",
    "description": "A small reserved region quietly indicates microphone mute or meeting state",
    "runtime": "host-event",
    "controls": [
      {
        "id": "opacity",
        "label": "Status opacity",
        "kind": "range",
        "default": 0.4,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "stale",
        "label": "Source expiry",
        "kind": "range",
        "default": 10,
        "min": 2,
        "max": 60,
        "step": 1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 173,
    "id": "expansion.focus-arc",
    "name": "Focus Arc",
    "family": "Useful event lighting",
    "description": "A real focus-session timer advances around the board’s perimeter and changes character during a break",
    "runtime": "host-event",
    "controls": [
      {
        "id": "workMix",
        "label": "Work brightness",
        "kind": "range",
        "default": 0.35,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "breakMix",
        "label": "Break brightness",
        "kind": "range",
        "default": 0.25,
        "min": 0.1,
        "max": 0.8,
        "step": 0.05,
        "unit": "ratio"
      }
    ]
  },
  {
    "number": 174,
    "id": "expansion.timer-landing",
    "name": "Timer Landing",
    "family": "Useful event lighting",
    "description": "The last few seconds of a timer converge toward a selected key, followed by a short completion cue",
    "runtime": "host-event",
    "controls": [
      {
        "id": "countdown",
        "label": "Final interval",
        "kind": "range",
        "default": 10,
        "min": 3,
        "max": 60,
        "step": 1,
        "unit": "s"
      },
      {
        "id": "resultHold",
        "label": "Completion cue",
        "kind": "range",
        "default": 1,
        "min": 0.2,
        "max": 5,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 175,
    "id": "expansion.laptop-battery-contour",
    "name": "Laptop Battery Contour",
    "family": "Useful event lighting",
    "description": "A discreet region displays the computer battery’s level and charging direction",
    "runtime": "host-event",
    "controls": [
      {
        "id": "opacity",
        "label": "Battery opacity",
        "kind": "range",
        "default": 0.25,
        "min": 0.05,
        "max": 0.7,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "warning",
        "label": "Low-level threshold",
        "kind": "range",
        "default": 20,
        "min": 5,
        "max": 40,
        "step": 1,
        "unit": "percent"
      }
    ]
  },
  {
    "number": 176,
    "id": "expansion.application-scene-switch",
    "name": "Application Scene Switch",
    "family": "Useful event lighting",
    "description": "The foreground application selects a named scene, with a smooth transition and a manual override",
    "runtime": "host-event",
    "controls": [
      {
        "id": "transition",
        "label": "Scene transition",
        "kind": "range",
        "default": 0.8,
        "min": 0.1,
        "max": 4,
        "step": 0.1,
        "unit": "s"
      },
      {
        "id": "dwell",
        "label": "Minimum app dwell",
        "kind": "range",
        "default": 0.5,
        "min": 0,
        "max": 3,
        "step": 0.1,
        "unit": "s"
      }
    ]
  },
  {
    "number": 177,
    "id": "expansion.shortcut-layer-guide",
    "name": "Shortcut Layer Guide",
    "family": "Useful event lighting",
    "description": "Holding a modifier highlights the next keys in a curated shortcut map for the active application",
    "runtime": "host-event",
    "controls": [
      {
        "id": "opacity",
        "label": "Guide opacity",
        "kind": "range",
        "default": 0.6,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "ratio"
      },
      {
        "id": "release",
        "label": "Guide release fade",
        "kind": "range",
        "default": 0.25,
        "min": 0,
        "max": 1,
        "step": 0.05,
        "unit": "s"
      }
    ]
  },
  {
    "number": 178,
    "id": "expansion.notification-inbox",
    "name": "Notification Inbox",
    "family": "Useful event lighting",
    "description": "A few reserved LEDs represent unacknowledged events and clear when the host reports them handled",
    "runtime": "host-event",
    "controls": [
      {
        "id": "capacity",
        "label": "Reserved markers",
        "kind": "range",
        "default": 4,
        "min": 1,
        "max": 12,
        "step": 1,
        "unit": "count"
      },
      {
        "id": "expiry",
        "label": "Unacknowledged lifetime",
        "kind": "range",
        "default": 60,
        "min": 5,
        "max": 300,
        "step": 5,
        "unit": "s"
      }
    ]
  },
  {
    "number": 179,
    "id": "expansion.resource-weather",
    "name": "Resource Weather",
    "family": "Useful event lighting",
    "description": "A low-motion field responds to computer load, with separate channels for a few selected resource measurements",
    "runtime": "host-event",
    "controls": [
      {
        "id": "response",
        "label": "Metric smoothing",
        "kind": "range",
        "default": 2,
        "min": 0.2,
        "max": 10,
        "step": 0.2,
        "unit": "s"
      },
      {
        "id": "warning",
        "label": "High-load threshold",
        "kind": "range",
        "default": 80,
        "min": 40,
        "max": 95,
        "step": 5,
        "unit": "percent"
      }
    ]
  },
  {
    "number": 180,
    "id": "expansion.local-event-canvas",
    "name": "Local Event Canvas",
    "family": "Useful event lighting",
    "description": "A local application sends structured events such as job progress or stream state to named lighting overlays",
    "runtime": "host-event",
    "controls": [
      {
        "id": "capacity",
        "label": "Event queue cap",
        "kind": "range",
        "default": 64,
        "min": 8,
        "max": 256,
        "step": 8,
        "unit": "events"
      },
      {
        "id": "expiry",
        "label": "Event lifetime",
        "kind": "range",
        "default": 5,
        "min": 0.5,
        "max": 30,
        "step": 0.5,
        "unit": "s"
      }
    ]
  }
];
const seeded=new Set([1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,19,20,21,22,33,34,35,36,42,43,45,48,53,56,58,59,60,61,62,63,64,65,66,67,68,69,71,75,80,82,85,88,89,94,95,97,98,99,100,101,102,103,104,105,106,107,108,112,119,120,131,135,141,144,157,160,161,164,166,167,168]);
export const EXPANSION_PARAMETERS: Readonly<Record<string,readonly AnimationParameter[]>> = Object.fromEntries(EXPANSION_CATALOG.map(s=>[s.id,[...s.controls,...(seeded.has(s.number)?[{id:'seed',label:'Seed',kind:'range',default:1,min:1,max:65535,step:1} satisfies AnimationParameter]:[])]]));
