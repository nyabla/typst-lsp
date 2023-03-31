window.onload = () => {


window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'updatePages':
            loadPdf(message.pdf, message.pages_to_update)
            break;
    }
});

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = window.PdfjsWorkerUrl;


async function loadPdf(pdfData, pages_to_update) {
    try {
        //var pdfjsLib = window['pdfjs-dist/build/pdf'];
        //console.log(pdfjsLib);

        // Using DocumentInitParameters object to load binary data.
        var loadingTask = pdfjsLib.getDocument({data: atob(pdfData)});
        
        const pdf = await loadingTask.promise;

        console.log('PDF loaded');
        
        // Fetch the first page
        const renderPage = async (pageNumber) => {
            let page = await pdf.getPage(pageNumber);

            let offCanvas = document.createElement('canvas');
            offCanvas.id = `page-${pageNumber}`;

            console.log(`page-${pageNumber} loaded`);
            
            // https://github.com/mozilla/pdf.js/issues/10509#issuecomment-517009617
            var scale = window.devicePixelRatio || 1;
            var displayWidth = 1;
            
            var viewport = page.getViewport({ scale: scale });

            //if(canvas.height != Math.round(viewport.height))
            {
                offCanvas.height = viewport.height;
                offCanvas.width = viewport.width;
                offCanvas.style.width = `${(viewport.width * displayWidth) / scale}px`;
                offCanvas.style.height = `${(viewport.height * displayWidth) / scale}px`;
            }
            const ctx = offCanvas.getContext('2d');


            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);
            await renderTask.promise
            console.log(`page-${pageNumber} rendered`);
            const previousCanvas = window.document.getElementById('page-'+pageNumber);
            if(previousCanvas) {
                previousCanvas.parentNode.insertBefore(offCanvas, previousCanvas);
                previousCanvas.parentNode.removeChild(previousCanvas);
            } else {
                const nextCanvas = window.document.getElementById('page-'+(pageNumber+1));
                if(nextCanvas) {
                    nextCanvas.parentNode.insertBefore(offCanvas, nextCanvas);
                }
                else
                {
                    document.getElementById('viewerContainer').appendChild(offCanvas);
                }
            }
        }
        for(let i=0; i<pdf.numPages; i++) {
            if(!pages_to_update || pages_to_update[i])
                await renderPage(i+1);
        }
        let outOfBoundsPage = pdf.numPages + 1;
        let outOfBoundsCanvas;
        while(outOfBoundsCanvas = document.getElementById(`page-${outOfBoundsPage}`)) {
            outOfBoundsCanvas.parentNode.removeChild(outOfBoundsCanvas);
            outOfBoundsPage++;
        }
    }
    catch (err) {
        console.error(err);
    }
}

}
