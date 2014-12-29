define([
    'dojo/_base/declare',
    'dojo/_base/json',
    'dojo/topic',
    //'dojo/parser',
    'dojo/dom',
    'dojo/dom-attr',
    'dojo/dom-construct',
    'dijit/_WidgetBase',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/Color',
    'dojox/lang/functional',
    "dojo/query",
    //'dijit/registry',
    "dojo/ready",
	'esri/layers/GraphicsLayer',
	'esri/graphic',
	'esri/renderers/SimpleRenderer',
	'esri/symbols/SimpleMarkerSymbol',
	'esri/symbols/SimpleLineSymbol',
	'esri/symbols/SimpleFillSymbol',
	'esri/graphicsUtils',
	'esri/tasks/FindTask',
	'esri/tasks/FindParameters',
	'esri/geometry/Extent',
	'esri/tasks/IdentifyTask',
	'esri/tasks/IdentifyParameters',
	'esri/InfoTemplate',
	'esri/SpatialReference'
	//,"dojo/domReady!"
], function ( declare, dojo,topic
//,parser
,dom,domAttr, domConst,_WidgetBase, lang,array,Color, functional,query
//,registry
,ready,GraphicsLayer, Graphic, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, graphicsUtils, FindTask, FindParameters, Extent,IdentifyTask, IdentifyParameters,InfoTemplate,SpatialReference) {
		return declare([_WidgetBase], {

        postCreate: function () {
            this.inherited(arguments);

        } ,
        startup: function () {
			 this.inherited(arguments);

             // get the GET querystring params from the url
             var query = document.location.search.substring(document.location.search.indexOf("?") + 1, document.location.search.length);
			 var qo = dojo.queryToObject(query);

             if (qo.pin) {
				    // TODO: Add options for setting up query parameters
					var findParams = new FindParameters();
					findParams.returnGeometry = true;
					findParams.layerIds = [1]; //query.layerIds;
					findParams.searchFields = ["PATPCL_PIN"];
					findParams.searchText = qo.pin.trim();
					findParams.contains = false;

					findParams.outSpatialReference = {
						wkid: app.map.spatialReference.wkid
					};

                    // TODO: make the AGS mapservice to query an option/parameter
					var findTask = new FindTask("http://gisvm101:6080/arcgis/rest/services/IGIS/MapServer");
                    findTask.execute(findParams,lang.hitch(this, 'findRes') );
			 }


		    if (qo.layers) {  // mod TOC state to reflect

		      var layerqs=decodeURIComponent(qo.layers);
              var mlyrs = dojo.fromJson(layerqs);
			  // set map visible layers accordingly
              var mscntr=0;
			  array.forEach(this.map.layerIds, lang.hitch(this, function(id) {
				  var mapService = this.map.getLayer(id);
				  /*
				  array.forEach(mapService.layerInfos, lang.hitch(this, function(li) {
						//console.log("   --------Layer Info ------------- "  );
						//console.log(li);
				 }));
				 */

				  if (!mapService.hasOwnProperty('_basemapGalleryLayerType')) {
						  //mapService.setVisibility(true);
						  //mapService.setOpacity(0.5);
						   if (mapService.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') {
                               mapService.setVisibleLayers(mlyrs[mscntr]);
						       mscntr++;
						   }
				  }
			  }));
		    }


		    if (qo.extent) {  // zoom to
		      var extqs=decodeURIComponent(qo.extent);
              var extarr=extqs.split(',');
              var extnt = new Extent(parseFloat(extarr[0]),parseFloat(extarr[1]),parseFloat(extarr[2]),parseFloat(extarr[3]), this.map.spatialReference);
              this.map.setExtent(extnt);
		    }

        },
        identifyResult: function(results){
			 console.log("identifyResult");
			 //this.map.infoWindow.setContent('<div class="loading"></div>');
		}
 		,findRes:function(results) {

            var zoomExtent = null;

            // add graphics layer if it does not already exist
		    var polygonGraphics = this.map.getLayer("findGraphics_polygon");
            if (!polygonGraphics) polygonGraphics = new GraphicsLayer({ id: 'findGraphics_polygon', title: 'Find Graphics' });
            this.map.addLayer(polygonGraphics);


            // TODO: make the infotemplate an option/parameter
            var infoTemplate = new InfoTemplate("Parcel Info", "<table><tr><td>PIN: </td><td>${PARCEL ID}</td></tr><tr><td>Owner: </td><td>${OWNER}</td></tr></table>");


            var feats=[];

            // add each result to the graphics layer
			array.forEach( results, function (result) {
				  var graphic, feature = result.feature;

                  feature.setInfoTemplate(infoTemplate);
				  feats.push(feature);

				  switch (feature.geometry.type) {
						case 'point':
						    // TODO: Add point graphics
							break;
						case 'polyline':
						    // TODO: Add polyline graphics
							break;
						case 'polygon':
							if (feature.geometry.rings && feature.geometry.rings.length > 0) {

								graphic = new Graphic(feature.geometry, null, {
									ren: 1
								});

                                // TODO: make symbology an option/parameter
								graphic.setSymbol(new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
											 new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
											 new Color([0, 0, 235]), 3), new Color([0, 10, 205, 0.15])));

								polygonGraphics.add(graphic);
							}
							break;
						default:
				  }

                  // update the results extent
				  if ( polygonGraphics.graphics.length > 0) {
						if (zoomExtent === null) {
							zoomExtent = graphicsUtils.graphicsExtent(polygonGraphics.graphics);
						} else {
							zoomExtent = zoomExtent.union(graphicsUtils.graphicsExtent(polygonGraphics.graphics));
						}
				  }
			}); // end array.forEach

            // zoom to the result(s)
			if (zoomExtent)  this.map.setExtent(zoomExtent.expand(5.2));


            // Show info popup
			var mapPoint = zoomExtent.getCenter();

/*          // we don't need to do a seperate identify because the result features can just be passed to the infoWindow
            var identify = new IdentifyTask("http://gisvm101:6080/arcgis/rest/services/IGIS/MapServer");
			var identifyParams = new IdentifyParameters();
			identifyParams.tolerance = 5;
			identifyParams.returnGeometry = false;
			identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
			identifyParams.geometry = mapPoint;
			identifyParams.mapExtent = zoomExtent;
			identifyParams.width = this.map.width;
			identifyParams.height = this.map.height;
			identifyParams.spatialReference = this.map.spatialReference;
		    identifyParams.layerIds = [0];

		    var deferred = identify.execute(identifyParams,lang.hitch(this, 'identifyResult'));
*/

		   //this.map.infoWindow.setContent('<div class="loading"></div>');
           this.map.infoWindow.setFeatures(feats);
           this.map.infoWindow.show(mapPoint);

		}  // end findRes
   });  // end return
});  // end declare function