/*! Eretek Online Araçlar #23 — E-posta Header Analizi */
ERT.def('23', {
	run: function (v, c) {
		var raw = String(v.hdr || '').replace(/\r\n?/g, '\n');
		var cut = raw.search(/\n\s*\n/); if (cut > 0) { raw = raw.slice(0, cut); } // gövde varsa at
		var lines = raw.split('\n'), H = [];
		lines.forEach(function (l) { if (/^[ \t]/.test(l) && H.length) { H[H.length - 1][1] += ' ' + l.trim(); } else { var k = l.indexOf(':'); if (k > 0) { H.push([l.slice(0, k).trim(), l.slice(k + 1).trim()]); } } });
		if (!H.length) { throw c.fe('hdr', 'noHdr'); }
		var get = function (n) { var x = H.filter(function (h) { return h[0].toLowerCase() === n; }); return x.map(function (h) { return h[1]; }); };
		var rec = get('received'), hops = [];
		rec.slice().reverse().forEach(function (r, i) {
			var semi = r.lastIndexOf(';'), ds = semi >= 0 ? r.slice(semi + 1).trim() : '', t = ds ? Date.parse(ds.replace(/\s*\([^)]*\)\s*$/, '')) : NaN;
			var from = (/\bfrom\s+([^\s;]+)/i.exec(r) || [])[1] || '', by = (/\bby\s+([^\s;]+)/i.exec(r) || [])[1] || '', fp = (/\bfrom\s+\S+\s*\(([^)]*)\)/i.exec(r) || [])[1] || '',
				ipf = /\[(?:IPv6:)?([0-9a-f:.]{3,})\]/i.exec(fp) || /^\s*(?:IPv6:)?([0-9a-f:.]{7,})\s*$/i.exec(fp), // alıcının gördüğü bağlantı IP'si (TCP bilgisi)
				ipm = /\[(?:IPv6:)?([0-9a-f:.]{3,})\]|\(([0-9a-f:.]{7,})\)/i.exec(r), ip = ipf ? ipf[1] : (ipm ? (ipm[1] || ipm[2]) : '');
			hops.push({ n: i + 1, from: from, by: by, ip: ip, t: t, ds: ds });
		});
		var rows = [], cls = [], msgs = [], delays = [];
		hops.forEach(function (h, i) {
			var dl = i && isFinite(h.t) && isFinite(hops[i - 1].t) ? (h.t - hops[i - 1].t) / 1000 : null;
			if (dl !== null) { delays.push(dl); }
			rows.push([h.n, h.from || '–', h.by || '–', h.ip || '–', isFinite(h.t) ? new Date(h.t).toISOString().replace('.000', '') : c.t('noDate'), dl === null ? '–' : c.dur(Math.abs(dl)) + (dl < 0 ? ' (' + c.t('neg') + ')' : '')]);
			cls.push(dl !== null && (dl < 0 || dl > 300) ? 'warn' : '');
		});
		if (delays.some(function (x) { return x < 0; })) { msgs.push(['warn', c.t('negMsg')]); }
		var kv = [['From', (get('from')[0] || '–')], ['Return-Path', get('return-path')[0] || '–'], ['To', get('to')[0] || '–'], ['Subject', get('subject')[0] || '–'], ['Date', get('date')[0] || '–'], ['Message-ID', get('message-id')[0] || '–']];
		get('dkim-signature').forEach(function (s) { var dd = (/\bd=([^;\s]+)/.exec(s) || [])[1], ss = (/\bs=([^;\s]+)/.exec(s) || [])[1]; kv.push(['DKIM-Signature', 'd=' + (dd || '?') + ' s=' + (ss || '?')]); });
		var ar = get('authentication-results'), arRows = [];
		ar.forEach(function (a) { ['spf', 'dkim', 'dmarc', 'arc', 'compauth'].forEach(function (m) { var r2 = new RegExp('\\b' + m + '=(\\w+)', 'i').exec(a); if (r2) { var f0 = a.split(';')[0].trim(); arRows.push([/=/.test(f0) ? '–' : f0, m.toUpperCase(), r2[1]]); } }); });
		var tot = hops.length > 1 && isFinite(hops[0].t) && isFinite(hops[hops.length - 1].t) ? (hops[hops.length - 1].t - hops[0].t) / 1000 : null;
		if (tot !== null) { kv.push([c.t('total'), c.dur(Math.abs(tot))]); }
		msgs.push(['info', c.t('trust')]);
		var cols = [c.t('c_hop'), c.t('c_from'), c.t('c_by'), 'IP', c.t('c_time'), c.t('c_delay')];
		var tables = [{ h: c.t('hopsH'), cols: cols, rows: rows, cls: cls }];
		if (arRows.length) { tables.push({ h: 'Authentication-Results', cols: [c.t('c_srv'), c.t('c_mech'), c.t('c_res')], rows: arRows, cls: arRows.map(function (r3) { return /pass/i.test(r3[2]) ? 'ok' : (/fail|softfail|none|temperror|permerror/i.test(r3[2]) ? 'warn' : ''); }) }); }
		return { big: c.t('big', { n: hops.length }), kv: kv, msgs: msgs, tables: tables, x: { csv: { name: 'email-hops', cols: cols, rows: rows } }, v: { hops: hops.length, delays: delays } };
	}
});
