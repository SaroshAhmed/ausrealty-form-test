import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import logo from '../assets/logo.png';
import * as pdfjsLib from 'pdfjs-dist';
import Draggable from 'react-draggable';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const AddFields = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        address: '',
        acn: '',
        abn: '',
        purchaserSolicitor: '',
        purchaserSolicitorAddress: '',
        purchaserSolicitorPhone: '',
        purchaserSolicitorFax: '',
        purchaserSolicitorRef: '',
        purchasePrice: 0,
        purchaseDeposit: 0,
        purchaseBalance: 0,
        dateofCompletion: '',
        otherField: '',
    });

    const [checkboxStates, setCheckboxStates] = useState({
        AC: false,
        clothesLine: false,
        floorCoverings: false,
        rangeHood: false,
        blinds: false,
        curtains: false,
        insectScreens: false,
        solarPanels: false,
        builtInWardrobes: false,
        dishwasher: false,
        lightFittings: false,
        stove: false,
        ceilingFans: false,
        EVCharger: false,
        poolEquipment: false,
        tvAntenna: false,
        vacantPossession: false,
        existingTenacies: false,
        other: false,
    });

    const [showModal, setShowModal] = useState(false);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [otherInput, setOtherInput] = useState(false);
    const excludedFields = ['vacantPossession', 'existingTenacies'];
    const [notFoundKeywords, setNotFoundKeywords] = useState([]);
    const canvasRef = useRef(null);
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setUploadedFile(file);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        const updatedData = {
            ...formData,
            [name]: value,
        };

        if (name === "purchasePrice" || name === "purchaseDeposit") {
            updatedData.purchaseBalance =
                parseFloat(updatedData.purchasePrice || 0) -
                parseFloat(updatedData.purchaseDeposit || 0);
        }

        setFormData(updatedData);
    };

    const handleCheckboxChange = (e) => {
        setCheckboxStates({
            ...checkboxStates,
            [e.target.name]: e.target.checked,
        });
        if (e.target.name === 'other' && e.target.checked) {
            setOtherInput(true)
        }
    };

    // Function to extract the keyword position from the uploaded PDF
    const extractKeywordPosition = async (pdfFile, keyword, occurrence = 1) => {
        try {
            
            const arrayBuffer = await pdfFile.arrayBuffer(); 

            // Pass the ArrayBuffer to getDocument
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const page = await pdfDoc.getPage(1);

            const textContent = await page.getTextContent();
            const textItems = textContent.items; 



            let matchCount = 0;
            // Loop through all text items and search for the keyword
            for (let i = 0; i < textItems.length; i++) {
                const item = textItems[i];
                if (item.str.toLowerCase().includes(keyword.toLowerCase())) {
                    matchCount++;
                    if (matchCount === occurrence) {
                        // Return the position of the desired occurrence
                        return { x: item.transform[4], y: item.transform[5] };
                    }
                }
            }
            setNotFoundKeywords((prev) => {
                if (!prev.includes(keyword)) {
                    return [...prev, keyword];
                }
                return prev;
            });
            // If the keyword is not found, return a default position
            const defaultPositions = {
                'air conditioning': { x: 132, y: 472 },
                'curtains': { x: 229, y: 456 },
                'ev charger': { x: 229, y: 426 },
                'clothes line': { x: 229, y: 472 },
                'fixed floor coverings': { x: 322, y: 472 },
                'range hood': { x: 428, y: 472 },
                'blinds': { x: 132, y: 456 },
                'insect screens': { x: 322, y: 456 },
                'solar panels': { x: 427, y: 456 },
                'wardrobes': { x: 132, y: 442 },
                'dishwasher': { x: 229, y: 442 },
                'light fittings': { x: 322, y: 442 },
                'stove': { x: 427, y: 442 },
                'ceiling fans': { x: 132, y: 426 },
                'pool equipment': { x: 322, y: 426 },
                'TV antenna': { x: 427, y: 426 },
                'other:': { x: 132, y: 411 },
                'VACANT POSSESSION': { x: 131, y: 562 },
                'subject to existing tenancies': { x: 266, y: 562 },
                'exclusions': { x: 60, y: 266 },
                'balance': { x: 60, y: 238 },
                'completion': { x: 120, y: 616 }

            };


            return defaultPositions[keyword.toLowerCase()] || { x: 0, y: 0 };
        } catch (error) {
            console.error(`Error extracting position for keyword "${keyword}":`, error);

            // Update the state for failed keyword
            setNotFoundKeywords((prev) => {
                if (!prev.includes(keyword)) {
                    return [...prev, keyword];
                }
                return prev;
            });

            // Return fallback default position
            return { x: 0, y: 0 };
        }

    };

    const generatePdf = async () => {
        setIsLoading(true);
        try {
            if (!uploadedFile) {
                alert('Please upload a PDF file first.');
                return;
            }

            // Extract keyword positions for checkboxes
            const acPosition = await extractKeywordPosition(uploadedFile, 'air conditioning');
            const curtainsPosition = await extractKeywordPosition(uploadedFile, 'curtains');
            const evChargerPosition = await extractKeywordPosition(uploadedFile, 'EV charger');
            const clotheslinePosition = await extractKeywordPosition(uploadedFile, 'clothes line');
            const floorCoveringsPosition = await extractKeywordPosition(uploadedFile, 'fixed floor coverings');
            const rangeHoodPosition = await extractKeywordPosition(uploadedFile, 'range hood');
            const blindsPosition = await extractKeywordPosition(uploadedFile, 'blinds');
            const insectScreensPosition = await extractKeywordPosition(uploadedFile, 'insect screens');
            const solarPanelsPosition = await extractKeywordPosition(uploadedFile, 'solar panels');
            const builtInWardrobesPosition = await extractKeywordPosition(uploadedFile, 'wardrobes');
            const dishwasherPosition = await extractKeywordPosition(uploadedFile, 'dishwasher');
            const lightFittingsPosition = await extractKeywordPosition(uploadedFile, 'light fittings');
            const stovePosition = await extractKeywordPosition(uploadedFile, 'stove');
            const ceilingFansPosition = await extractKeywordPosition(uploadedFile, 'ceiling fans');
            const poolEquipmentPosition = await extractKeywordPosition(uploadedFile, 'pool equipment');
            const tvAntennaPosition = await extractKeywordPosition(uploadedFile, 'TV antenna');
            const otherPosition = await extractKeywordPosition(uploadedFile, 'other:', 2);
            const vacantPossessionPosition = await extractKeywordPosition(uploadedFile, 'VACANT POSSESSION');
            const existingtenanciesPosition = await extractKeywordPosition(uploadedFile, 'subject to existing tenancies');
            const purchaserNamePosition = await extractKeywordPosition(uploadedFile, 'exclusions');
            const pricePosition = await extractKeywordPosition(uploadedFile, 'balance');
            const dateofCompletionPosition = await extractKeywordPosition(uploadedFile, 'completion');

            // Converting the uploaded file into an ArrayBuffer
            const pdfTemplate = await uploadedFile.arrayBuffer();

            // Loading the uploaded PDF into pdf-lib
            const pdfDoc = await PDFDocument.load(pdfTemplate, { ignoreEncryption: true });

            // Accessing the first page of the document (index 0)
            const firstPage = pdfDoc.getPage(0);
            // Checking if the date of completion field is filled

            if (formData.dateofCompletion && formData.dateofCompletion.trim() !== '') {
                // Drawing a white rectangle over the Date of Completion section to cover the old text
                firstPage.drawRectangle({
                    x: dateofCompletionPosition.x + 93,
                    y: dateofCompletionPosition.y - 3,
                    width: 180,
                    height: 16,
                    color: rgb(1, 1, 1),
                });

                // Drawing the new Date of Completion text
                firstPage.drawText(formData.dateofCompletion, {
                    x: dateofCompletionPosition.x + 99,
                    y: dateofCompletionPosition.y,
                    size: 9,
                    color: rgb(0, 0, 0),
                });
            }
            // Adding form fields
            firstPage.drawText(`Name: ${formData.name}`, { x: purchaserNamePosition.x + 110, y: purchaserNamePosition.y - 10, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`Address: ${formData.address}`, { x: purchaserNamePosition.x + 110, y: purchaserNamePosition.y - 20, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`ACN/ARBN: ${formData.acn}`, { x: purchaserNamePosition.x + 420, y: purchaserNamePosition.y - 10, size: 8, color: rgb(0, 0, 0) });
            firstPage.drawText(`ABN: ${formData.abn}`, { x: purchaserNamePosition.x + 420, y: purchaserNamePosition.y - 20, size: 8, color: rgb(0, 0, 0) });

            firstPage.drawText(`Name: ${formData.purchaserSolicitor}`, { x: purchaserNamePosition.x + 110, y: purchaserNamePosition.y - 40, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`Address: ${formData.purchaserSolicitorAddress}`, { x: purchaserNamePosition.x + 110, y: purchaserNamePosition.y - 50, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`Phone: ${formData.purchaserSolicitorPhone}`, { x: purchaserNamePosition.x + 420, y: purchaserNamePosition.y - 40, size: 8, color: rgb(0, 0, 0) });
            firstPage.drawText(`Fax: ${formData.purchaserSolicitorFax}`, { x: purchaserNamePosition.x + 420, y: purchaserNamePosition.y - 50, size: 8, color: rgb(0, 0, 0) });
            firstPage.drawText(`Ref: ${formData.purchaserSolicitorRef}`, { x: purchaserNamePosition.x + 420, y: purchaserNamePosition.y - 60, size: 8, color: rgb(0, 0, 0) });

            firstPage.drawText(`$: ${formData.purchasePrice}`, { x: pricePosition.x + 95, y: pricePosition.y + 25, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`$: ${formData.purchaseDeposit}`, { x: pricePosition.x + 95, y: pricePosition.y + 15, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`$: ${formData.purchaseBalance}`, { x: pricePosition.x + 95, y: pricePosition.y, size: 9, color: rgb(0, 0, 0) });
            firstPage.drawText(`${formData.otherField}`, { x: 168, y: 408, size: 9, color: rgb(0, 0, 0) });
            
            // Checkbox positions
            const checkboxCoordinates = {
                AC: { x: acPosition.x - 8, y: acPosition.y + 3 },
                curtains: { x: curtainsPosition.x - 8, y: curtainsPosition.y + 3 },
                EVCharger: { x: evChargerPosition.x - 8, y: evChargerPosition.y + 3 },
                clothesLine: { x: clotheslinePosition.x - 8, y: clotheslinePosition.y + 3 },
                floorCoverings: { x: floorCoveringsPosition.x - 8, y: floorCoveringsPosition.y + 3 },
                rangeHood: { x: rangeHoodPosition.x - 8, y: rangeHoodPosition.y + 3 },
                blinds: { x: blindsPosition.x - 8, y: blindsPosition.y + 3 },
                insectScreens: { x: insectScreensPosition.x - 8, y: insectScreensPosition.y + 3 },
                solarPanels: { x: solarPanelsPosition.x - 8, y: solarPanelsPosition.y + 4 },
                builtInWardrobes: { x: builtInWardrobesPosition.x - 30, y: builtInWardrobesPosition.y + 3 },
                dishwasher: { x: dishwasherPosition.x - 8, y: dishwasherPosition.y + 3 },
                lightFittings: { x: lightFittingsPosition.x - 8, y: lightFittingsPosition.y + 3 },
                stove: { x: stovePosition.x - 8, y: stovePosition.y + 3 },
                ceilingFans: { x: ceilingFansPosition.x - 8, y: ceilingFansPosition.y + 3 },
                poolEquipment: { x: poolEquipmentPosition.x - 8, y: poolEquipmentPosition.y + 3 },
                tvAntenna: { x: tvAntennaPosition.x - 8, y: tvAntennaPosition.y + 3 },
                other: { x: otherPosition.x - 8, y: otherPosition.y + 3 },
                vacantPossession: { x: vacantPossessionPosition.x - 8, y: vacantPossessionPosition.y + 3 },
                existingTenacies: { x: existingtenanciesPosition.x - 8, y: existingtenanciesPosition.y + 4 },
            };

            const squareSize = 7;
            const squareColor = rgb(0, 0, 0);

            Object.entries(checkboxStates).forEach(([key, isChecked]) => {
                if (isChecked) {
                    const { x, y } = checkboxCoordinates[key];
                    firstPage.drawRectangle({
                        x: x - squareSize / 2,
                        y: y - squareSize / 2,
                        width: squareSize,
                        height: squareSize,
                        color: squareColor,
                    });
                }
            });

            // Saving the modified PDF
            const pdfBytes = await pdfDoc.save();

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const pdfBlobUrl = URL.createObjectURL(blob);
            setPdfBlob(pdfBlobUrl);


            // Rendering the first page to canvas after modifications
            renderPdfToCanvas(pdfBytes);

            setShowModal(true);
        } catch (err) {
            console.error('Error generating PDF:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to render the first page of the PDF to a canvas
    const renderPdfToCanvas = async (pdfArrayBuffer) => {
        try {
            const loadingTask = pdfjsLib.getDocument(pdfArrayBuffer);
            const pdfDoc = await loadingTask.promise;
            const page = await pdfDoc.getPage(1); 

            
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            
            const scale = 1.5; 
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            
            page.render({
                canvasContext: context,
                viewport: viewport,
            });
        } catch (err) {
            console.error('Error rendering PDF to canvas:', err);
        }
    };
    const closeModal = () => {
        setShowModal(false);
    };

    const handleSubmit = () => {
        saveAs(pdfBlob, 'modified_form.pdf'); 
        setShowModal(false);
    };

    const handleEdit = () => {
        closeModal();
    };

    const formatLabel = (key) => {
        return key
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, (str) => str.toUpperCase()); 
    };
    const filteredCheckboxStates = Object.keys(checkboxStates).filter(
        (key) => !excludedFields.includes(key)
    );
    return (
        <div>

            <div className='flex justify-center'>
                <img src={logo} alt="" className='w-44 lg:52 mt-10 h-auto' />
            </div>
            <form className='mx-10'>
                {/* <h2 className="my-6 text-xl font-semibold text-center">A Real Estate Agent is permitted by legislation to fill up the items in this box in a sale of residential property  </h2> */}

                <h1 className="text-lg text-center my-6  text-gray-400">22A Park Street, Peakhurst:</h1>
                <div className="col-span-full text-center mt-4">
                    <h1 className="text-xl my-6 font-semibold">Purchaser Information:</h1>
                </div>
                <div className='flex justify-between'>
                    <button className='font-semibold '> ID CARD <i class=" ml-4 fa-solid fa-plus"></i></button>
                    {/* <label className="w-24 mb-2 text-sm font-medium">Upload PDF:</label> */}
                    <div className="relative">
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            id="fileInput"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <label
                            htmlFor="fileInput"
                            className="w-52 p-2 text-center font-semibold text-black cursor-pointer "
                        >
                            FILE <i class=" ml-4 fa-solid fa-plus "></i>
                        </label>
                    </div>
                </div>
                {/* PURCHASER INFORMATION */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium">Name:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder="Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium">Address:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Address"
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium">ACN/ARBN:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            name="acn"
                            value={formData.acn}
                            onChange={handleChange}
                            placeholder="ACN/ ARBN"
                        />
                    </label>

                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium">ABN:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            name="abn"
                            value={formData.abn}
                            onChange={handleChange}
                            placeholder="ABN"
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium">Name:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder="Date of Completion"
                            name="dateofCompletion"
                            value={formData.dateofCompletion}
                            onChange={handleChange}
                        />
                    </label>
                    <div className="col-span-full text-center">
                        <h1 className="text-xl my-6 font-semibold">Solicitor Information:</h1>
                    </div>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium"> Solicitor Name:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder=" Name"
                            name="purchaserSolicitor"
                            value={formData.purchaserSolicitor}
                            onChange={handleChange}
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium"> Solicitor Address:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder=" Address"
                            name="purchaserSolicitorAddress"
                            value={formData.purchaserSolicitorAddress}
                            onChange={handleChange}
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium"> Solicitor Phone:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder=" Phone"
                            name="purchaserSolicitorPhone"
                            value={formData.purchaserSolicitorPhone}
                            onChange={handleChange}
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium"> Solicitor Fax:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder=" Fax"
                            name="purchaserSolicitorFax"
                            value={formData.purchaserSolicitorFax}
                            onChange={handleChange}
                        />
                    </label>
                    <label className="flex flex-col">
                        {/* <h3 className="text-sm font-medium"> Solicitor Reference:</h3> */}
                        <input
                            type="text"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600 w-full"
                            placeholder=" Reference"
                            name="purchaserSolicitorRef"
                            value={formData.purchaserSolicitorRef}
                            onChange={handleChange}
                        />
                    </label>

                    {/* Purchase Information */}
                    <div className="col-span-full text-center">
                        <h1 className="text-xl my-2 font-semibold">Price Information:</h1>
                    </div>
                    <label className="flex flex-col">
                        <h3 className="text-sm font-medium">Purchase Price:</h3>
                        <input
                            type="number"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder="Enter purchase price"
                            name="purchasePrice"
                            value={formData.purchasePrice}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="flex flex-col">
                        <h3 className="text-sm font-medium">Purchase Deposit:</h3>
                        <input
                            type="number"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            placeholder="Enter deposit amount"
                            name="purchaseDeposit"
                            value={formData.purchaseDeposit}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="flex flex-col">
                        <h3 className="text-sm font-medium">Purchase Balance:</h3>
                        <input
                            type="number"
                            className="mt-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                            name="purchaseBalance"
                            value={formData.purchaseBalance}
                            readOnly
                        />
                    </label>
                </div>
                <div className="col-span-full text-center mt-4">

                    <h1 className="text-xl my-6 font-semibold">Property Status:</h1>
                </div>
                <div className="my-4 grid grid-cols-2 gap-4">
                    {excludedFields.map((key) => (
                        <label
                            key={key}
                            className="flex grow items-center space-x-2 border rounded-lg p-4 hover:bg-gray-100 transition-all"
                        >
                            <input
                                type="checkbox"
                                name={key}
                                checked={checkboxStates[key]}
                                onChange={handleCheckboxChange}
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>

                <div>

                </div>
                <div className="col-span-full text-center mt-4">

                    <h1 className="text-xl my-6 font-semibold">Inclusions:</h1>
                </div>
                {/* OTher Information  */}


                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {filteredCheckboxStates.map((key) => (
                        <label key={key} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-100 transition-all">
                            <input
                                type="checkbox"
                                name={key}
                                checked={checkboxStates[key]}
                                onChange={handleCheckboxChange}
                                className="border-gray-300 rounded h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">{formatLabel(key)}</span>
                        </label>
                    ))}
                </div>

                {otherInput &&
                    (
                        <>
                            <input
                                type="text"
                                className="mt-4 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-600"
                                placeholder=" other"
                                name="otherField"
                                value={formData.otherField}
                                onChange={handleChange}
                            />
                        </>
                    )}
                <div>
                    <h1>PDF Keyword Extraction</h1>
                    <p>Keywords not found: {notFoundKeywords.join(', ')}</p>

                </div>
                <div className="flex justify-center my-4">
                    <button
                        type="button"
                        onClick={generatePdf}
                        className="border-2 border-black text-black px-4 py-2 rounded-lg flex items-center space-x-2"
                        disabled={isLoading}
                    >
                        <span>{isLoading ? 'Processing...' : 'Review Changes'}</span>
                        {isLoading && (
                            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0" fill="none" />
                                <path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="4" fill="none" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-3/4 max-w-4xl">
                       

                        {/* Canvas for displaying the first page */}
                        <div className="overflow-auto max-h-[80vh] mb-6">
                            <canvas ref={canvasRef} className="w-full" />
                        </div>

                        {/* Action buttons at the bottom */}
                        <div className="flex justify-center mt-4 space-x-4">
                            <button
                                onClick={handleSubmit}
                                className="border-2 border-black text-black px-6 py-2 rounded-lg hover:bg-black hover:text-white duration-150"
                            >
                                <i className="fa-solid fa-download"></i> Submit
                            </button>
                            <button
                                onClick={handleEdit}
                                className="border-2 border-black text-black px-6 py-2 rounded-lg hover:bg-black hover:text-white duration-150"
                            >
                                <i className="fa-solid fa-caret-left "></i> Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AddFields;