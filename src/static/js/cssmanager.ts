'use strict';
export const makeCSSManager = (browserSheet) => {
    const browserRules = () => (browserSheet.cssRules || browserSheet.rules);
    const browserDeleteRule = (i) => {
        if (browserSheet.deleteRule)
            browserSheet.deleteRule(i);
        else
            browserSheet.removeRule(i);
    };
    const browserInsertRule = (i, selector) => {
        if (browserSheet.insertRule)
            browserSheet.insertRule(`${selector} {}`, i);
        else
            browserSheet.addRule(selector, null, i);
    };
    const selectorList = [];
    const indexOfSelector = (selector) => {
        for (let i = 0; i < selectorList.length; i++) {
            if (selectorList[i] === selector) {
                return i;
            }
        }
        return -1;
    };
    const selectorStyle = (selector) => {
        let i = indexOfSelector(selector);
        if (i < 0) {
            // add selector
            browserInsertRule(0, selector);
            selectorList.splice(0, 0, selector);
            i = 0;
        }
        return browserRules().item(i).style;
    };
    const removeSelectorStyle = (selector) => {
        const i = indexOfSelector(selector);
        if (i >= 0) {
            browserDeleteRule(i);
            selectorList.splice(i, 1);
        }
    };
    return {
        selectorStyle,
        removeSelectorStyle,
        info: () => `${selectorList.length}:${browserRules().length}`,
    };
};
