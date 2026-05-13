// Converts Unicode characters commonly found in science/math questions to their
// LaTeX equivalents. Pass mode='text' for text outside math delimiters (math
// outputs are wrapped in $...$), or mode='math' for content already inside $...$.
function unicodeToLatex(text, mode) {
	// Each entry: [unicodeChar, textModeReplacement, mathModeReplacement]
	const conversions = [
		// Hyphens and dashes
		['­', '',    ''   ],  // soft hyphen → remove
		['‐', '-',   '-'  ],  // hyphen
		['‑', '-',   '-'  ],  // non-breaking hyphen
		['‒', '--',  '-'  ],  // figure dash
		['–', '--',  '-'  ],  // en dash
		['—', '---', '-'  ],  // em dash
		['−', '$-$', '-'  ],  // minus sign

		// Degree symbol
		['°', '$^{\\circ}$', '^{\\circ}'],

		// Subscript digits and signs
		['₀', '$_{0}$', '_{0}'], ['₁', '$_{1}$', '_{1}'],
		['₂', '$_{2}$', '_{2}'], ['₃', '$_{3}$', '_{3}'],
		['₄', '$_{4}$', '_{4}'], ['₅', '$_{5}$', '_{5}'],
		['₆', '$_{6}$', '_{6}'], ['₇', '$_{7}$', '_{7}'],
		['₈', '$_{8}$', '_{8}'], ['₉', '$_{9}$', '_{9}'],
		['₊', '$_{+}$', '_{+}'], ['₋', '$_{-}$', '_{-}'],
		['ₐ', '$_{a}$', '_{a}'], ['ₑ', '$_{e}$', '_{e}'],
		['ₒ', '$_{o}$', '_{o}'], ['ₓ', '$_{x}$', '_{x}'],
		['ₙ', '$_{n}$', '_{n}'],

		// Superscript digits and signs
		['⁰', '$^{0}$', '^{0}'], ['¹', '$^{1}$', '^{1}'],
		['²', '$^{2}$', '^{2}'], ['³', '$^{3}$', '^{3}'],
		['⁴', '$^{4}$', '^{4}'], ['⁵', '$^{5}$', '^{5}'],
		['⁶', '$^{6}$', '^{6}'], ['⁷', '$^{7}$', '^{7}'],
		['⁸', '$^{8}$', '^{8}'], ['⁹', '$^{9}$', '^{9}'],
		['⁺', '$^{+}$', '^{+}'], ['⁻', '$^{-}$', '^{-}'],

		// Greek lowercase
		['α', '$\\alpha$',      '\\alpha'     ],
		['β', '$\\beta$',       '\\beta'      ],
		['γ', '$\\gamma$',      '\\gamma'     ],
		['δ', '$\\delta$',      '\\delta'     ],
		['ε', '$\\varepsilon$', '\\varepsilon'],
		['ζ', '$\\zeta$',       '\\zeta'      ],
		['η', '$\\eta$',        '\\eta'       ],
		['θ', '$\\theta$',      '\\theta'     ],
		['ι', '$\\iota$',       '\\iota'      ],
		['κ', '$\\kappa$',      '\\kappa'     ],
		['λ', '$\\lambda$',     '\\lambda'    ],
		['μ', '$\\mu$',         '\\mu'        ],
		['ν', '$\\nu$',         '\\nu'        ],
		['ξ', '$\\xi$',         '\\xi'        ],
		['π', '$\\pi$',         '\\pi'        ],
		['ρ', '$\\rho$',        '\\rho'       ],
		['σ', '$\\sigma$',      '\\sigma'     ],
		['τ', '$\\tau$',        '\\tau'       ],
		['υ', '$\\upsilon$',    '\\upsilon'   ],
		['φ', '$\\varphi$',     '\\varphi'    ],
		['χ', '$\\chi$',        '\\chi'       ],
		['ψ', '$\\psi$',        '\\psi'       ],
		['ω', '$\\omega$',      '\\omega'     ],
		['µ', '$\\mu$',         '\\mu'        ],  // micro sign (U+00B5)

		// Greek uppercase
		['Γ', '$\\Gamma$',    '\\Gamma'   ],
		['Δ', '$\\Delta$',    '\\Delta'   ],
		['Θ', '$\\Theta$',    '\\Theta'   ],
		['Λ', '$\\Lambda$',   '\\Lambda'  ],
		['Ξ', '$\\Xi$',       '\\Xi'      ],
		['Π', '$\\Pi$',       '\\Pi'      ],
		['Σ', '$\\Sigma$',    '\\Sigma'   ],
		['Υ', '$\\Upsilon$',  '\\Upsilon' ],
		['Φ', '$\\Phi$',      '\\Phi'     ],
		['Ψ', '$\\Psi$',      '\\Psi'     ],
		['Ω', '$\\Omega$',    '\\Omega'   ],

		// Math operators and relations
		['×', '$\\times$',   '\\times'  ],
		['÷', '$\\div$',     '\\div'    ],
		['±', '$\\pm$',      '\\pm'     ],
		['∓', '$\\mp$',      '\\mp'     ],
		['≤', '$\\leq$',     '\\leq'    ],
		['≥', '$\\geq$',     '\\geq'    ],
		['≠', '$\\neq$',     '\\neq'    ],
		['≈', '$\\approx$',  '\\approx' ],
		['≡', '$\\equiv$',   '\\equiv'  ],
		['∝', '$\\propto$',  '\\propto' ],
		['∞', '$\\infty$',   '\\infty'  ],
		['·', '$\\cdot$',    '\\cdot'   ],
		['⋅', '$\\cdot$',    '\\cdot'   ],
		['∂', '$\\partial$', '\\partial'],
		['∇', '$\\nabla$',   '\\nabla'  ],
		['∑', '$\\sum$',     '\\sum'    ],
		['∫', '$\\int$',     '\\int'    ],
		['√', '$\\sqrt{}$',  '\\sqrt{}' ],
		['∈', '$\\in$',      '\\in'     ],
		['∉', '$\\notin$',   '\\notin'  ],
		['⊂', '$\\subset$',  '\\subset' ],
		['∪', '$\\cup$',     '\\cup'    ],
		['∩', '$\\cap$',     '\\cap'    ],
		['∅', '$\\emptyset$','\\emptyset'],
		['′', "$'$",         "'"        ],
		['″', "$''$",        "''"       ],
		['ℓ', '$\\ell$',     '\\ell'    ],

		// Arrows
		['→', '$\\rightarrow$',     '\\rightarrow'    ],
		['←', '$\\leftarrow$',      '\\leftarrow'     ],
		['↔', '$\\leftrightarrow$', '\\leftrightarrow'],
		['↑', '$\\uparrow$',        '\\uparrow'       ],
		['↓', '$\\downarrow$',      '\\downarrow'     ],
		['⇒', '$\\Rightarrow$',     '\\Rightarrow'    ],
		['⇐', '$\\Leftarrow$',      '\\Leftarrow'     ],
		['⇔', '$\\Leftrightarrow$', '\\Leftrightarrow'],

		// Special scientific units
		['℃', '$^{\\circ}$C',  '^{\\circ}\\text{C}'],  // ℃
		['℉', '$^{\\circ}$F',  '^{\\circ}\\text{F}'],  // ℉
		['Å', '\\AA{}',        '\\text{\\AA}'       ],  // Å (angstrom)

		// Miscellaneous text symbols
		['™', '\\texttrademark{}',  '\\texttrademark{}'  ],  // ™
		['©', '\\textcopyright{}',  '\\textcopyright{}'  ],  // ©
		['®', '\\textregistered{}', '\\textregistered{}' ],  // ®
	];

	for (const [from, textTo, mathTo] of conversions) {
		text = text.split(from).join(mode === 'text' ? textTo : mathTo);
	}
	return text;
}

module.exports = { unicodeToLatex };
