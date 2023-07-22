/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./public/**/*.{html,js}'],
	plugins: [require('daisyui'), require('tailwindcss-hero-patterns')],
	theme: {
		screens: {
			'2xs': '290px',
			'xs': '320px',
			'sm': '500px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
			'3xl': '1920px'
		},
		fontFamily: {
			'sans': ['Inter', 'sans-serif'],
			'poppins': ['Poppins', 'sans-serif']
		},
		extend: {
			colors: {
				'gris-100': '#E6E5E6',
				'gris-200': '#9CA3AF',
				'gris-300': '#BABABA',
				'gris-400': '#6C6C6C',
			},
			lineHeight: {
				'12': '3rem',
				'14': '4.25rem',
			},
			gridTemplateColumns: {
				'gridMainContainer': '1.1fr 1fr',
			},
			gridTemplateRows: {
				'minGridMainContainer': '1.8fr 0.7fr',
				'minGridMainContainer2': '1.5fr 0.9fr',
			}
		},
	},
	daisyui: {
		logs: false,
		themes: [
			{ light: {
				"base-200": "#252837",
				"info": "#1982C4",
			}},
			{ dark: {
				"base-100": "#1A1B26",
				"base-200": "#16161E",
				"info": "#1982C4"
			}}
		],
	}
}