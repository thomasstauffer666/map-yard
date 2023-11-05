module.exports = {
	'env': {
		'es6': true,
		'browser': true,
	},
	'parserOptions': {
		'ecmaVersion': 2022,
		'sourceType': 'module',
	},
	'extends': 'eslint:recommended',
	'rules': {
		'indent': ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		'quotes': ['error', 'single'],
		'semi': ['error', 'always'],
		'keyword-spacing': ['error', { 'before': true, 'after': true }],
		'no-unused-vars': ['error', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_' }],
		'no-console': ['off'],
	}
};
