function escapeHtml(str) {
	return str.replace(/[&<>"']/g, tag => (
		{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
	)[tag] || tag);
}
