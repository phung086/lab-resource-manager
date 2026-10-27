import React from 'react';
import '../styles/resource-category-art.css';

/** Abstract category illustration, never a photograph of the actual asset. */
export function ResourceCategoryArt({ category }: { category?: string }) {
  return <svg className="resource-category-art" data-category={category || 'OTHER'} viewBox="0 0 320 210" fill="none" aria-hidden="true">
    <ellipse cx="160" cy="180" rx="105" ry="15" fill="currentColor" opacity=".09" />
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {category === 'ROOM' ? <>
        <path d="M50 159V53l123-26 97 45v89" fill="white" fillOpacity=".65" />
        <path d="M173 27v102M50 159l123-30 97 32M64 66l85-18v54l-85 20z" />
        <path d="M106 58v54M64 94l85-18M195 70l45 19v49l-45-15z" opacity=".5" />
        <path d="m98 142 77-17 57 25-76 19z" fill="white" /><path d="M108 147v27m49-5v22m64-36v24" />
        <path className="art-moving" d="m186 115 20-4 19 10-20 4zM205 125v16" />
      </> : category === 'EQUIPMENT' ? <>
        <path d="M89 176h144l-16-18H111z" fill="white" /><path d="M176 66c67 25 58 91 4 92h-35" strokeWidth="14" opacity=".2" />
        <path d="M176 66c67 25 58 91 4 92h-35" /><path d="m139 49 18-15 41 47-20 17z" fill="white" />
        <path d="m132 41 19-17 10 11-20 18zM174 99l-14 14M114 124h68M139 125v33" />
        <circle className="art-moving" cx="204" cy="112" r="11" fill="white" /><path d="M124 117h40" strokeWidth="5" />
      </> : category === 'MACHINE' ? <>
        <path d="M77 47h165v122H77z" fill="white" fillOpacity=".65" /><path d="M94 65h103v83H94zM212 65h15v24h-15z" />
        <path d="M83 177h155M105 169v8m103-8v8M107 135h77M146 65v35" />
        <path className="art-moving" d="M135 91h22v26h-22zM146 117v9" fill="white" />
        <circle cx="219" cy="109" r="5" /><circle cx="219" cy="128" r="5" />
      </> : category === 'EXPERIMENT_KIT' ? <>
        <path d="m57 137 127-35 81 43-130 37z" fill="white" /><path d="m57 137 1 15 77 40 130-36v-11M135 182v10" />
        <path d="M94 126V99h31v19M163 119V80h38v27M204 130l23-6 12 7-23 7z" fill="white" />
        <path className="art-moving" d="M106 99V76h70v4M125 117l38-10" /><circle cx="146" cy="148" r="11" /><path d="m80 140 31 16m69-14 18 9" />
      </> : category === 'MATERIAL' ? <>
        <path d="m76 90 84-28 84 28-84 29zM76 90v66l84 32 84-32V90M160 119v69" fill="white" fillOpacity=".65" />
        <path d="m119 76 82 29v30l-19 7v-30M91 130l29 11m-29 1 20 8" />
        <path className="art-moving" d="m160 62 0-25m-19 11 19-11 19 11" />
      </> : <><rect x="90" y="50" width="140" height="120" rx="18" fill="white" /><path d="M120 90h80m-80 25h60m-60 25h40" /></>}
    </g>
    <circle cx="54" cy="46" r="5" fill="currentColor" opacity=".2" /><path d="M263 40v14m-7-7h14" stroke="currentColor" opacity=".35" strokeWidth="2" />
  </svg>;
}
