/**
 * Check to see if the subject matches the given string or RegExp
 * @param {String} subject  The string to test
 * @param {String|RegExp|undefined} [stringOrRegExp]  The string or regex to match against
 * @returns {Boolean}  Return true on exact string match, regex match or when stringOrRegExp is undefined
 * @private
 */
function equalsOrMatches(subject, stringOrRegExp = undefined) {
	if (stringOrRegExp === undefined) {
		return true;
	}
	if (stringOrRegExp instanceof RegExp) {
		return stringOrRegExp.test(subject);
	}
	return stringOrRegExp === subject;
}

module.exports = equalsOrMatches;
