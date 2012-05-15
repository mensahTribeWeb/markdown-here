/*
 * Copyright Adam Pritchard 2012
 * MIT License : http://adampritchard.mit-license.org/
 */

// Finds and returns the page element that currently has focus. Drills down into
// iframes if necessary.
function findFocusedElem() {
  var focusedElem = document.activeElement;

  // If the focus is within an iframe, we'll have to drill down to get to the
  // actual element.
  while (focusedElem['contentDocument'])
  {
      focusedElem = focusedElem.contentDocument.activeElement;
  }

  return focusedElem;
}

// Get the plaintext representation of the given HTML.
function plaintextFromHtml(html) {
  var extractedText;

  function tagreplacement(text) {
    var replaced =
      text
        .replace(/<div[^>]*>/ig, '<br>') // opening <div> --> <br>
        .replace(/<\/div>/ig, '')        // closing </div> --> nothing
        .replace(/&nbsp;/ig, ' ');       // &nbsp; --> space
    return replaced;
  }

  extractedText = htmlToText(html, {tagreplacement: tagreplacement});
  return extractedText;
}

// Uses marked.js
function markdownToHtml(md) {
  var html = marked(md);
  return html;
}

// Applies our styling explicitly to the elements under `elem`.
function makeStylesExplicit(elem) {
  var stylesheet, elemDocument;

  elemDocument = elem.ownerDocument;

  for (var i = 0; i < elemDocument.styleSheets.length; i++) {
    if (elemDocument.styleSheets[i].title == 'markdown-here-styles') {
      stylesheet = elemDocument.styleSheets[i];
      break;
    }
  }

  if (!stylesheet) {
    console.log('Unable to find our stylesheet!');
    return;
  }

  for (var i = 0; i < stylesheet.rules.length; i++) {
    var rule = stylesheet.rules[i];

    var selectorMatches = elemDocument.querySelectorAll(rule.selectorText);
    for (var j = 0; j < selectorMatches.length; j++) {
      selectorMatches[j].setAttribute('style', rule.style.cssText);
    }
  }
}

// Render the Markdown found in `elem` into pretty HTML and put it back into `elem`.
function renderMarkdown(elem) {
  var extractedHtml, md, mdHtml, marker;

  // Get the HTML containing the Markdown from the compose element.
  extractedHtml = elem.innerHTML;

  // Extract the plaintext Markdown from the HTML.
  md = plaintextFromHtml(extractedHtml);

  // Render the Markdown to pretty HTML.
  mdHtml = markdownToHtml(md);

  // Wrap our pretty HTML in a <div> that we can put body styles onto.
  // We'll also use the wrapper as a marker to indicate that we're in a rendered state.
  mdHtml = '<div id="markdown-here-wrapper">' + mdHtml + '</div>';

  // Output the styling and rendered Markdown back into the compose element.
  // `styles` comes from our JS'd CSS file.
  elem.innerHTML = styles + mdHtml;

  // Some webmail (Gmail) strips off any external style block. So we need to go
  // through our styles, explicitly applying them to matching elements.
  makeStylesExplicit(elem);

  // Store the original Markdown-in-HTML to a data attribute on the wrapper
  // element. We'll use this later if we need to unrender back to Markdown.
  elem.querySelector('#markdown-here-wrapper').setAttribute('data-md-original', extractedHtml);
}

// Revert the rendered-from-Markdown HTML found in `elem` back into Markdown and
// put it back into `elem`.
function unrenderMarkdown(elem) {
  var originalHtml;

  // Get the original Markdown-in-HTML that we stored when rendering.
  originalHtml = elem.querySelector('#markdown-here-wrapper').getAttribute('data-md-original');
  if (!originalHtml) {
    alert('Unable to revert to Markdown. Original not found.');
    return;
  }

  // Replace the contents of the element with the original Markdown.
  elem.innerHTML = originalHtml;
}

function inRenderedState(elem) {
  return !!elem.querySelector('#markdown-here-wrapper');
}

// The context menu handler.
chrome.extension.onRequest.addListener(function(event) {
  var focusedElem, initiallyRendered;

  focusedElem = findFocusedElem();
  if (!focusedElem) return;

  initiallyRendered = inRenderedState(focusedElem);

  // Toggle our rendered state.
  if (!initiallyRendered) {
    renderMarkdown(focusedElem);
  }
  else {
    unrenderMarkdown(focusedElem);
  }
});