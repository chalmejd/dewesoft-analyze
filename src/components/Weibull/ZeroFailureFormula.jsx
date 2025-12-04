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
        <p>For zero-failure test plans</p>
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
        <p>For allowed failures greater than zero a Weibull + Binomial model is used.</p>
        <MathJax>
        {`
        \\[
        P_{\\text{pass}}(T)
        = \\sum_{k=0}^{c}
            {n \\choose k}
            \\left[F(T)\\right]^{k}
            \\left[1 - F(T)\\right]^{\,n-k}
        \\]

        \\[
        F(T) = 1 - \\exp\\!\\left[-\\left(\\frac{T}{\\eta}\\right)^{\\beta}\\right],
        \\qquad
        \\eta = \\frac{L}{\\left(-\\ln R\\right)^{1/\\beta}}
        \\]

        \\[
        \\text{Solve for } T \\text{ such that:}\\quad
        P_{\\text{pass}}(T) \\ge C
        \\]
        `}
        </MathJax>


    </MathJaxContext>
  );
};

export default ZeroFailureFormula;
