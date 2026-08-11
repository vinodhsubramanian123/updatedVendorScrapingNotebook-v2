const fs = require('fs');
let content = fs.readFileSync('dashboard/src/components/ResolutionMatrix.jsx', 'utf8');

const replacement = `
        </div>
        
        {evalResults?.agenticExplanation && (
          <div className="mb-6 p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-purple-900 mb-1 flex items-center gap-2">
                Agentic Guardrail AI Insights 
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800 uppercase tracking-wider">
                  Autonomous
                </span>
              </h4>
              <div className="text-xs text-purple-800/90 whitespace-pre-wrap leading-relaxed">
                {evalResults.agenticExplanation}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
`;

// Insert it replacing the empty line between `</div>` and `<div className="grid...`
content = content.replace("        </div>\n\n        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">", replacement);
fs.writeFileSync('dashboard/src/components/ResolutionMatrix.jsx', content);
