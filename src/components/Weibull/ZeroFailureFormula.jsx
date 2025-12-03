import React from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';

  // MathJax configuration
  const mathJaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: { inlineMath: [["\\(", "\\)"], ["$", "$"]] },
  };

const ZeroFailureFormula = () => {
  return (
    <MathJaxContext config={mathJaxConfig}>
        <p>Calculates the exponentially weighted mean of a load using the following formula:</p>
        <MathJax>{"\\( T = L \\left( \\frac{\\ln(1 - C)}{Q \\, \\ln(R)} \\right)^{1/\\beta} \\)"}</MathJax>
        <p>
            where: <br />
            T = Test Duration <br />
            L = Target Life <br />
            C = Confidence <br />
            Q = Sample Quantity <br />
            R = Reliability <br />
            β = Weibull Shape Parameter
        </p>
    </MathJaxContext>
  );
};

export default ZeroFailureFormula;
