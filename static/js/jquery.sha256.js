/**
 * SHA256 Hash Algorithm Plugin
 *
 * @version 1.0 (06/09/2009)
 * @requires jQuery v1.2.6+
 * @author Alex Weber <alexweber.com.br>
 * @copyright Copyright (c) 2008-2009, Alex Weber
 * @see http://anmar.eu.org/projects/jssha2/
 * @see http://pajhome.org.uk/crypt/md5
 *
 * Distributed under the terms of the new BSD License
 * http://www.opensource.org/licenses/bsd-license.php
 */
 
/**
 * This plugin is based on the following work:
 *
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

(function($) {
	var chrsz = 8; // bits per input character. 8 - ASCII; 16 - Unicode
	
	var safe_add = function(x, y) {
		var lsw = (x & 0xFFFF) + (y & 0xFFFF);
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return (msw << 16) | (lsw & 0xFFFF);
	}
	
	var S = function(X, n) {
		return ( X >>> n ) | (X << (32 - n));
	}
	
	var R = function(X, n) {
		return ( X >>> n );	
	}
	
	var Ch = function(x, y, z) {
		return ((x & y) ^ ((~x) & z));
	}
	
	var Maj = function(x, y, z) {
		return ((x & y) ^ (x & z) ^ (y & z));
	}
	
	var Sigma0256 = function(x) {
		return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
	}
	
	var Sigma1256 = function(x) {
		return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
	}
	
	var Gamma0256 = function(x) {
		return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
	}

	var Gamma1256 = function (x) {
		return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
	}
	

	var core_sha256 = function(m, l) {
		var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
		var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    	var W = new Array(64);
	    var a, b, c, d, e, f, g, h, i, j;
    	var T1, T2;
		/* append padding */
		m[l >> 5] |= 0x80 << (24 - l % 32);
		m[((l + 64 >> 9) << 4) + 15] = l;
		for ( var i = 0; i<m.length; i+=16 ) {
			a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
			for ( var j = 0; j<64; j++) {
				if (j < 16) {
					W[j] = m[j + i];
				}else{
					W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
				}
				T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
				T2 = safe_add(Sigma0256(a), Maj(a, b, c));
				h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
			}
			HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
			HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
		}
		return HASH;
	}
	
	var str2binb = function(str) {
		var bin = Array();
		var mask = (1 << chrsz) - 1;
		for(var i = 0; i < str.length * chrsz; i += chrsz){
			bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
		}
		return bin;
	}
	
	var binb2hex = function(binarray) {
		//var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase */
		//var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
		var hex_tab = "0123456789abcdef";
		var str = "";
		for (var i = 0; i < binarray.length * 4; i++) {
			str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) + hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);	
		}
		return str;
	}

	var core_hmac_sha256 = function(key, data) {
		var bkey = str2binb(key);
		if(bkey.length > 16) {
			bkey = core_sha1(bkey, key.length * chrsz);
		}
		var ipad = Array(16), opad = Array(16);
		for(var i = 0; i < 16; i++) {
			ipad[i] = bkey[i] ^ 0x36363636;
			opad[i] = bkey[i] ^ 0x5C5C5C5C;
		}
		var hash = core_sha256(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
		return core_sha256(opad.concat(hash), 512 + 256);
	}
	
	var prep = function(string){
		string = typeof string == 'object' ? $(string).val() : string.toString();
		return string;
	}
	
	// standard sha256 implementation: var x = $.sha256(value);
	// standard sha266hmac implementation: varx = $.sha256hmac(value1, value2);
	$.extend({
		sha256 : function(string){
			string = prep(string);
			return binb2hex(core_sha256(str2binb(string),string.length * chrsz));
		},
		sha256hmac : function(key, data){
			key = prep(key);
			data = prep(data);
			return binb2hex(core_hmac_sha256(key, data));
		},
		sha256config : function(bits){
			chrsz = parseInt(bits) || 8;
		}
	});
	// alternative sha256 implementation: var x = value.sha256();
	$.fn.sha256 = function (bits) {
		// change bits
		$.sha256config(bits);
		var string = prep($(this).val());
		var val = $.sha256(string);
		// reset bits, this was a one-time operation
		$.sha256config(8);
		return val;
	};
})(jQuery);
