'use strict';

describe('import then timeslider', function () {
  beforeEach(async function () {
    await helper.aNewPad();
  });

  const getinnertext = () => {
    const inner = helper.padInner$;
    let newtext = '';
    inner('div').each((line, el) => {
      newtext += `${el.innerHTML}\n`;
    });
    console.log(newtext);
    return newtext;
  };

  const importrequest = (data, importurl, type) => {
    let error;
    const result = $.ajax({
      url: importurl,
      type: 'post',
      processData: false,
      async: false,
      contentType: 'multipart/form-data; boundary=boundary',
      accepts: {
        text: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      data: [
        'Content-Type: multipart/form-data; boundary=--boundary',
        '',
        '--boundary',
        `Content-Disposition: form-data; name="file"; filename="import.${type}"`,
        'Content-Type: text/plain',
        '',
        data,
        '',
        '--boundary',
      ].join('\r\n'),
      error(res) {
        error = res;
      },
    });
    expect(error).to.be(undefined);
    return result;
  };

  it('import a pad with indents from html', async function () {
    const importurl = `${helper.padChrome$.window.location.href}/import`;
    const html = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1 plus MathML 2.0//EN" "http://www.w3.org/Math/DTD/mathml2/xhtml-math11-f.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><!--This file was converted to xhtml by LibreOffice - see https://cgit.freedesktop.org/libreoffice/core/tree/filter/source/xslt for the code.--><head profile="http://dublincore.org/documents/dcmi-terms/"><meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/><title xml:lang="en-US"/><meta name="DCTERMS.title" content="" xml:lang="en-US"/><meta name="DCTERMS.language" content="en-US" scheme="DCTERMS.RFC4646"/><meta name="DCTERMS.source" content="http://xml.openoffice.org/odf2xhtml"/><meta name="DCTERMS.creator" content="Mayhew, Kate"/><meta name="DCTERMS.issued" content="2012-03-20T12:38:00" scheme="DCTERMS.W3CDTF"/><meta name="DCTERMS.contributor" content="Richard Hay"/><meta name="DCTERMS.modified" content="2012-03-20T14:42:00" scheme="DCTERMS.W3CDTF"/><meta name="DCTERMS.provenance" content="" xml:lang="en-US"/><meta name="DCTERMS.subject" content="," xml:lang="en-US"/><link rel="schema.DC" href="http://purl.org/dc/elements/1.1/" hreflang="en"/><link rel="schema.DCTERMS" href="http://purl.org/dc/terms/" hreflang="en"/><link rel="schema.DCTYPE" href="http://purl.org/dc/dcmitype/" hreflang="en"/><link rel="schema.DCAM" href="http://purl.org/dc/dcam/" hreflang="en"/><style type="text/css"> @page { } table { border-collapse:collapse; border-spacing:0; empty-cells:show } td, th { vertical-align:top; font-size:12pt;} h1, h2, h3, h4, h5, h6 { clear:both;} ol, ul { margin:0; padding:0;} li { list-style: none; margin:0; padding:0;} /* "li span.odfLiEnd" - IE 7 issue*/ li span. { clear: both; line-height:0; width:0; height:0; margin:0; padding:0; } span.footnodeNumber { padding-right:1em; } span.annotation_style_by_filter { font-size:95%; font-family:Arial; background-color:#fff000; margin:0; border:0; padding:0; } span.heading_numbering { margin-right: 0.8rem; }* { margin:0;} .P1 { font-size:9.5pt; line-height:200%; text-align:left ! important; font-family:Sabon; vertical-align:top; writing-mode:} .T1 { font-family:Times New Roman; font-size:12pt; } .T2 { font-family:Times New Roman; font-size:12pt; font-style:italic; } .WW8Num1z0 { font-family:Symbol; } .WW8Num1z2 { font-family:Courier New; } .WW8Num1z3 { font-family:Wingdings; } /* ODF styles with no properties representable as CSS */ { } </style></head><body dir="ltr" style="max-width:21.59cm;margin-top:2.54cm; margin-bottom:2.54cm; margin-left:2.54cm; margin-right:2.54cm; "><p class="P1"><span class="T1">Richard C. Hay is a business owner, teacher, designer, and publisher. He taught business and technical writing courses at the University of Wisconsin—Milwaukee, where he also completed his Masters’ of Arts and presented at many regional and national conferences. For the past fifteen years, he has owned a successful design, programming, and social services firm and, for the past six years, has served as publisher of the peer reviewed </span><span class="T2">Writing Lab Newsletter</span><span class="T1">. He also sits on the boards of two non-profits, including holding the position of President for Quest Ensemble. </span></p></body></html>';
    const inner$ = helper.padInner$;

    const textElement = inner$('div');
    textElement.sendkeys('{selectall}'); // select all
    textElement.sendkeys('{del}'); // clear the pad text
    importrequest(html, importurl, 'html');
    await helper.waitForPromise(() => getinnertext() === '<br>\n');
    inner$('div').first().sendkeys('a');

    // go to timeslider
    $('#iframe-container iframe')
        .attr('src', `${$('#iframe-container iframe').attr('src')}/timeslider`);

    await new Promise((resolve) => setTimeout(resolve, 6000));
    const timeslider$ = $('#iframe-container iframe')[0].contentWindow.$;
    timeslider$('#playpause_button_icon').click();
    const latestContents = timeslider$('#innerdocbody').text();
    expect(latestContents).to.be('a');
  });
});
