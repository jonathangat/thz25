// wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  // set query base
  var query_base = "https://jonathang.carto.com/api/v2/";

  //set up map
  var map = L.map("map", { zoomControl: false }).setView(
    [31.950124877508276, 34.80287893972995],
    10
  );

  function route_type_name(code) {
    if (code === 1) return "עורקי";
    if (code === 8) return "מקומי";
    if (code === 2) return "אזורי";
    if (code === 3) return "בינעירוני מטרופוליני";
    if (code === 4) return "בינעירוני ארצי";
    if (code === 5) return "פרימיום מטרופוליני";
    if (code === 7) return `מתע"ן`;
    return "אחר";
  }

  // Adding a basemap (Carto Voyager)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | אפיון ופיתוח: יונתן גת',
      maxZoom: 19,
    }
  ).addTo(map);

  // interaction - mouse hover
  // https://leafletjs.com/examples/choropleth/
  function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
      weight: 3,
      color: "#666",
      dashArray: "",
      fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
  }

  // add watermarks
  let logos = ["AyalonHighwaysPNG.png", "rashut_logo.png", "mot.png"];

  for (let i = 0; i < logos.length; i++) {
    L.Control.Watermark = L.Control.extend({
      onAdd: function (map) {
        var img = L.DomUtil.create("img");

        img.src = `./img/logos/${logos[i]}`;
        img.style.width = "100px";

        return img;
      },
    });

    L.control.watermark = function (opts) {
      return new L.Control.Watermark(opts);
    };

    L.control.watermark({ position: "bottomleft" }).addTo(map);
  }

  // ADD LAYER CONTROL TO MAP
  var layerControl = L.control.layers(null, null, { collapsed: false });
  layerControl.addTo(map);

  // ADD LEGEND
  let route_type_legend = {
    עורקי: "#a6cee3",
    מקומי: "#1f78b4",
    אזורי: "#b2df8a",
    "בינעירוני מטרופוליני": "#33a02c",
    "בינעירוני ארצי": "#fb9a99",
    "פרימיום מטרופוליני": "#e31a1c",
    'מתע"ן': "#fdbf6f",
    אחר: "gray",
  };

  let bus_lane_symbology = {
    קיים: "#f9bf00",
    מקודם: "#be0067",
    "אושר בועדה מטרופולינית": "#1d4ccc",
    "תכנון פרוגרמטי": "#92caea",
    "רשת צירי העדפה 2030+": "#b5b5b5",
    אחר: "gray",
  };

  let volume_symbology = {
    "10-0": "green",
    "20-10": "yellow",
    "30-20": "blue",
    "40-30": "red",
    "40+": "purple",
  };

  let terminal_symbology = {
    "מסוף גדול": "./img/symbols/terminals/large.png",
    "מסוף בינוני": "./img/symbols/terminals/medium.png",
    "מסוף קטן": "./img/symbols/terminals/small.png",
    "חניון לילה": "./img/symbols/terminals/night.png",
    "מתקן משולב": "./img/symbols/terminals/multi.png",
  };

  // add legend
  let legend = L.control({ position: "topleft" });
  legend.onAdd = function () {
    let div = L.DomUtil.create("div", "legend");
    // service lines
    let legendContent = "<b>מקרא</b><br />" + "<small>קווי שירות</small><br />";
    for (let i = 0; i < Object.keys(route_type_legend).length; i++) {
      legendContent += `<i style="background-color: ${
        Object.values(route_type_legend)[i]
      }"></i>${Object.keys(route_type_legend)[i]}<br />`;
    }

    // bus terminals
    legendContent += "<br /><small>מסופים</small><br />";
    for (let i = 0; i < Object.keys(terminal_symbology).length; i++) {
      legendContent += `<i style="background-image: url(${
        Object.values(terminal_symbology)[i]
      });background-repeat: no-repeat;background-size: contain;border-radius: 0%"></i>${
        Object.keys(terminal_symbology)[i]
      }<br />`;
    }
    // bus lanes
    legendContent += "<br /><small>נתיבי העדפה</small><br />";
    for (let i = 0; i < Object.keys(bus_lane_symbology).length; i++) {
      legendContent += `<i style="background-color:${
        Object.values(bus_lane_symbology)[i]
      }"></i>${Object.keys(bus_lane_symbology)[i]}<br />`;
    }

    // volumes
    legendContent += "<br /><small>נפחים</small><br />";
    for (let i = 0; i < Object.keys(volume_symbology).length; i++) {
      legendContent += `<i style="background-color: ${
        Object.values(volume_symbology)[i]
      }"></i>${Object.keys(volume_symbology)[i]}<br />`;
    }

    // assign html
    div.innerHTML = legendContent;
    return div;
  };

  legend.addTo(map);

  // LOAD BUS LANES LAYER
  var bus_lanes_layer_group = L.layerGroup();
  async function load_bus_lanes() {
    // set style
    function bus_lane_colour(lane_code) {
      if (lane_code === 0) return "#f9bf00";
      if (lane_code === 2) return "#be0067";
      if (lane_code === 3) return "#1d4ccc";
      if (lane_code === 4) return "#92caea";
      if (lane_code === 5) return "#b5b5b5";
      return "gray";
    }

    function bus_lane_dash_array(lane_code) {
      if (lane_code === 0) return null;
      if (lane_code === 2) return null;
      if (lane_code === 3) return null;
      if (lane_code === 4) return "5, 5";
      if (lane_code === 5) return "5, 5";
      return null;
    }

    function bus_lane_style(feature) {
      return {
        color: bus_lane_colour(feature.properties.status),
        dashArray: bus_lane_dash_array(feature.properties.status),
      };
    }

    // bind popup
    function bus_lane_status(lane_code) {
      if (lane_code === 0) return "קיים";
      if (lane_code === 2) return "מקודם";
      if (lane_code === 3) return "אושר בועדה מטרופולינית";
      if (lane_code === 4) return "תכנון פרוגרמטי";
      if (lane_code === 5) return "רשת צירי העדפה 2030+";
      return "אחר";
    }

    function onEachFeature(feature, layer) {
      let popupContent = `<div class="popupcontent"><span class="popupHeader">נתיב העדפה</span><br style="display: block;margin: 2px 0;" />`;

      if (feature.properties.type) {
        popupContent += `<b>סוג: </b> ${feature.properties.type} <br />`;
      }
      if (feature.properties.status) {
        popupContent += `<b>סטטוס:</b> ${bus_lane_status(
          feature.properties.status
        )}<br />`;
      }

      if (feature.properties.sourcename) {
        popupContent += `<b>מקור:</b> ${feature.properties.sourcename}<br />`;
      }

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // fetch data
    var fetch_bus_lanes = await fetch(
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT route_id, type, sourcename, status, the_geom FROM bus_lanes"
    ).then((response) => response.json());

    // parse to geojson
    let geojson = L.geoJson(fetch_bus_lanes, {
      onEachFeature: onEachFeature,
      style: bus_lane_style,
    }).addTo(bus_lanes_layer_group);

    // add to map
    bus_lanes_layer_group.addTo(map);

    // add to layer control
    layerControl.addOverlay(bus_lanes_layer_group, "נתיבי העדפה");
  }

  // call the function
  load_bus_lanes();

  // function to populate the jurisSelect dropdown
  async function populate_juris_select() {
    // specify query
    let q =
      "https://jonathang.carto.com/api/v2/sql?q=SELECT DISTINCT muni_name FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) ORDER BY muni_name ASC";

    // fetch
    let request = fetch(q);
    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        let html = "";
        data.rows.forEach(function (element) {
          html += "<option>" + element.muni_name + "</option>";
        });
        document.getElementById("jurisSelect").innerHTML = html;
      });
  }

  // function to populate the jurisTypeSelect dropdown
  async function populate_juris_type_select() {
    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;

    // specify query
    let q = `https://jonathang.carto.com/api/v2/sql?q=SELECT DISTINCT c_line_type FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}' ORDER BY c_line_type ASC`;

    // fetch
    let request = fetch(q);

    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        let html = "";
        data.rows.forEach(function (element) {
          html +=
            `<option value=${element.c_line_type}>` +
            route_type_name(element.c_line_type) +
            "</option>";
        });
        document.getElementById("jurisTypeSelect").innerHTML = html;
      });
  }

  // function to populate the jurisRouteIdSelect dropdown
  async function populate_juris_route_id_select() {
    // get juris value
    let juris_value = document.getElementById("jurisSelect").value;
    let type_value = document.getElementById("jurisTypeSelect").value;

    // specify query
    let q = `https://jonathang.carto.com/api/v2/sql?q=SELECT  route_id, route_short_name, origin_terminal_name, destination_terminal_name FROM planned_service CROSS JOIN muni_layer WHERE st_intersects(planned_service.the_geom, muni_layer.the_geom) AND muni_name = '${juris_value}' AND c_line_type = ${type_value} ORDER BY c_line_type ASC`;

    let request = fetch(q);
    var html = "";

    request
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        data.rows.forEach(function (element) {
          html +=
            `<option value="${element.route_id}">` +
            `${element.route_short_name.slice(-5)} מ${
              element.origin_terminal_name
            } אל ${element.destination_terminal_name}` +
            "</option>";
        });
        document.getElementById("jurisRouteIdSelect").innerHTML = html;
      });
  }

  // get JurisRoute Query
  function getJurisRouteQuery() {
    let selectedRoutes = document.getElementById("jurisRouteIdSelect");
    let selectedRoutesIds = [...selectedRoutes.selectedOptions].map(
      (option) => option.value
    );
    let selectedRoutesIdsString = selectedRoutesIds.join(",");

    let query_component = encodeURIComponent(
      `SELECT * FROM planned_service WHERE route_id IN (${selectedRoutesIdsString});`
    );

    let query = query_base + "sql?format=GeoJSON&q=" + query_component;

    return query;
  }

  // add an empty route layer
  let routeLayer = L.featureGroup();

  // add an empty terminal layer
  let terminalLayer = L.featureGroup();

  // add an empty volumn layer
  let volumeLayer = L.featureGroup();

  // get volumes query
  function get_volume_query() {
    // get values
    let fromHour = document.getElementById("SelectVolumeFrom").value;
    let fromHourInt = parseInt(fromHour);
    let toHour = document.getElementById("SelectVolumeTo").value;
    let toHourInt = parseInt(toHour);

    if (toHourInt == "") {
      toHourInt = fromHourInt + 1;
    }

    let freq_cols = [];

    for (let i = fromHourInt; i < toHourInt; i++) {
      freq_cols.push(`freq_${i}`);
    }

    let columns_to_sum = freq_cols.join("+");

    let query_component = encodeURIComponent(
      `SELECT segment_id, (${columns_to_sum}) AS volume, the_geom FROM volumes;`
    );

    return query_base + "sql?format=GeoJSON&q=" + query_component;
  }

  // get volumes
  async function get_volumes() {
    // start spinning!
    map.spin(true);

    // clear previous queries
    volumeLayer.clearLayers();

    // clear layer control
    layerControl.removeLayer(volumeLayer);

    function getColor(d) {
      return d > 40
        ? "purple"
        : d > 30
        ? "red"
        : d > 20
        ? "blue"
        : d > 10
        ? "yellow"
        : d > 0
        ? "green"
        : "gray";
    }

    function volume_style(feature) {
      return {
        color: getColor(feature.properties.volume),
      };
    }

    // fetch data
    var fetch_volumes = await fetch(get_volume_query()).then((response) =>
      response.json()
    );

    // parse to geojson
    let geojson = L.geoJson(fetch_volumes, {
      // onEachFeature: onEachFeature,
      style: volume_style,
    }).addTo(volumeLayer);

    // add to map
    volumeLayer.addTo(map);

    // add to layer control
    layerControl.addOverlay(volumeLayer, "מפת נפחים");

    // fly to bounds
    map.flyToBounds(volumeLayer.getBounds());

    // stop spinning
    map.spin(false);

    // close modal
    $("#VolumeModal").modal("toggle");
  }

  // get routes by query
  async function getRoutes(q) {
    // start spinning!
    map.spin(true);

    function route_type_colour(code) {
      if (code === 1) return "#a6cee3";
      if (code === 8) return "#1f78b4";
      if (code === 2) return "#b2df8a";
      if (code === 3) return "#33a02c";
      if (code === 4) return "#fb9a99";
      if (code === 5) return "#e31a1c";
      if (code === 7) return "#fdbf6f";
      return "gray";
    }

    function route_style(feature) {
      return {
        color: route_type_colour(feature.properties.c_line_type),
      };
    }

    // clear previous queries
    routeLayer.clearLayers();
    layerControl.removeLayer(routeLayer);

    // fetch request
    let request = fetch(q);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.route_short_name) {
        popupContent += `<span class="popupHeader">קו: ${feature.properties.route_short_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.c_line_type) {
        popupContent += `<b>סוג קו: </b>${route_type_name(
          feature.properties.c_line_type
        )}<br />`;
      }
      if (feature.properties.route_desc) {
        popupContent += `<b>תיאור קו: </b>${feature.properties.route_desc}<br />`;
      }
      if (feature.properties.direction_id) {
        popupContent += `<b>כיוון קו: </b>${feature.properties.direction_id}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף מוצא: </b>${feature.properties.origin_terminal_id}<br />`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף מוצא: </b>${feature.properties.origin_terminal_name}<br />`;
      }
      if (feature.properties.origin_terminal_id) {
        popupContent += `<b>מזהה מסוף יעד: </b>${feature.properties.destination_terminal_id}<br />`;
      }
      if (feature.properties.origin_terminal_name) {
        popupContent += `<b>שם מסוף יעד: </b>${feature.properties.destination_terminal_name}<br />`;
      }

      popupContent += "<br />";

      if (feature.properties.route_length) {
        popupContent += `<b>אורך מסלול במטרים:</b> ${feature.properties.route_length}<br />`;
      }
      if (feature.properties.bus_lane_length) {
        popupContent += `<b>מתוכם נתיבי העדפה:</b> ${feature.properties.bus_lane_length}<br />`;
      }
      if (feature.properties.bus_lane_existing_length) {
        popupContent += `<b>מתוכם קיימים: </b> ${feature.properties.bus_lane_existing_length}<br />`;
      }
      if (feature.properties.bus_lane_planned_length) {
        popupContent += `<b>מתוכם מתוכננים: </b> ${feature.properties.bus_lane_planned_length}<br />`;
      }
      if (feature.properties.bus_lane_ratio) {
        popupContent += `<b>אחוז העדפה סה"כ:</b> ${
          feature.properties.bus_lane_ratio * 100
        }%<br />`;
      }
      if (feature.properties.bus_lane_existing_ratio) {
        popupContent += `<b>אחוז העדפה קיים:</b> ${
          feature.properties.bus_lane_existing_ratio * 100
        }%<br />`;
      }
      if (feature.properties.bus_lane_planned_ratio) {
        popupContent += `<b>אחוז העדפה מתוכנן:</b> ${
          feature.properties.bus_lane_planned_ratio * 100
        }%<br />`;
      }

      popupContent += `<br />`;

      // morning_peak 	evening_peak 	max_hourly_freq
      if (feature.properties.morning_peak) {
        popupContent += `<b>תדירות שעות שיא בוקר:</b> ${feature.properties.morning_peak}<br />`;
      }
      if (feature.properties.evening_peak) {
        popupContent += `<b>תדירות שעות שיא ערב:</b> ${feature.properties.evening_peak}<br />`;
      }
      if (feature.properties.max_hourly_freq) {
        popupContent += `<b>תדירות שעתית מקסימלית:</b> ${feature.properties.max_hourly_freq}<br />`;
      }
      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
      style: route_style,
    }).addTo(routeLayer);

    // add layer to map
    routeLayer.addTo(map);

    // add to layer control
    layerControl.addOverlay(routeLayer, "קווי שירות");

    // fly to bounds
    map.flyToBounds(routeLayer.getBounds());

    // stop spinning
    map.spin(false);
  }

  // get all routes
  async function get_all_routes() {
    getRoutes(
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT%20*%20FROM%20planned_service"
    );
  }

  // get juris routes
  async function get_juris_routes() {
    getRoutes(getJurisRouteQuery());
  }

  ///////////////////////////////////////////////

  // get all routes
  async function get_all_terminals() {
    // start spinning!
    map.spin(true);

    // clear previous queries
    terminalLayer.clearLayers();

    // query string
    let sqlGetAllTerminals =
      "https://jonathang.carto.com/api/v2/sql?format=GeoJSON&q=SELECT * FROM bus_terminals";

    // fetch request
    let request = fetch(sqlGetAllTerminals);

    // reset highlight
    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    // create a single polygon with centre
    // https://stackoverflow.com/questions/62469635/how-to-add-a-marker-to-the-middle-of-a-polygon-in-leaflet
    var polygonsWithCenters = L.layerGroup();

    // set costum icon
    var term_icon = L.Icon.extend({
      options: {
        iconSize: [15, 15],
      },
    });

    var term_large = new term_icon({
        iconUrl: "./img/symbols/terminals/large.png",
      }),
      term_medium = new term_icon({
        iconUrl: "./img/symbols/terminals/medium.png",
      }),
      term_multi = new term_icon({
        iconUrl: "./img/symbols/terminals/multi.png",
      }),
      term_night = new term_icon({
        iconUrl: "./img/symbols/terminals/night.png",
      }),
      term_small = new term_icon({
        iconUrl: "./img/symbols/terminals/small.png",
      }),
      term_missing = new term_icon({
        iconUrl: "./img/symbols/terminals/missing.png",
      });

    function get_term_icon(term_type) {
      if (term_type === "חניון לילה") return term_night;
      if (term_type === "מסוף גדול") return term_large;
      if (term_type === "מסוף בינוני") return term_medium;
      if (term_type === "מתקן משולב") return term_multi;
      if (term_type === "מסוף קטן") return term_small;
      return term_small;
    }

    // on each feature
    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        // click: clickFeature,
      });

      // build popup content
      let popupContent = `<div class="popupcontent">`;
      if (feature.properties.term_name) {
        popupContent += `<span class="popupHeader">${feature.properties.term_name}</span><br style="display: block;margin: 2px 0;" />`;
      }
      if (feature.properties.unique_id) {
        popupContent += `<b>קוד מסוף: </b>${feature.properties.unique_id}<br />`;
      }
      if (feature.properties.term_type) {
        popupContent += `<b>סוג מסוף: </b>${feature.properties.term_type}<br />`;
      }
      if (feature.properties.peak_morning_in) {
        popupContent += `<b>נסיעות נכנסות שעות שיא בוקר: </b>${feature.properties.peak_morning_in}<br />`;
      }
      if (feature.properties.peak_evening_in) {
        popupContent += `<b>נסיעות נכנסות שעות שיא ערב: </b>${feature.properties.peak_evening_in}<br />`;
      }
      if (feature.properties.peak_morning_out) {
        popupContent += `<b>נסיעות יוצאות שעות שיא בוקר: </b>${feature.properties.peak_morning_out}<br />`;
      }
      if (feature.properties.peak_evening_out) {
        popupContent += `<b>נסיעות יוצאות שעות שיא ערב: </b>${feature.properties.peak_evening_out}<br />`;
      }
      if (feature.properties.served_routes) {
        popupContent += `<b>קווים משורתים: </b>${feature.properties.served_routes}<br />`;
      }

      popupContent += `</div>`;
      // layer.bindPopup(popupContent);

      // get centre
      var centre = layer.getBounds().getCenter();

      var term_marker = L.marker(centre, {
        icon: get_term_icon(feature.properties.term_type),
      }).bindPopup(popupContent);

      var polygonAndItsCentre = L.layerGroup([layer, term_marker]);
      polygonAndItsCentre.addTo(polygonsWithCenters);
    }

    // parse request to geojson object
    let parsed_geojson = await request.then((response) => response.json());

    let geojson = L.geoJson(parsed_geojson, {
      onEachFeature: onEachFeature,
      style: {
        weight: 2,
        fillColor: "yellow",
        fillOpacity: 0.2,
      },
    });

    polygonsWithCenters.addTo(terminalLayer);

    // add to layer control
    layerControl.addOverlay(terminalLayer, "מסופים מתוכננים");

    // fly to bounds
    // map.flyToBounds(terminalLayer.getBounds());

    // add layer to map
    terminalLayer.addTo(map);

    // stop spinning
    map.spin(false);
  }

  get_all_terminals();

  // Volume Modal - Populate selectVolumeFrom
  async function PopulateSelectVolumeFrom() {
    let html = "";
    for (let i = 5; i < 25; i++) {
      html += `<option>${i}</option>`;
    }
    document.getElementById("SelectVolumeFrom").innerHTML = html;
  }

  // Volume Modal - Populate SelectVolumeTo and SelectVolumeTo
  async function PopulateSelectVolumeTo() {
    let fromHour = document.getElementById("SelectVolumeFrom").value;
    let fromHourInt = parseInt(fromHour);
    let html = "";
    for (let i = fromHourInt + 1; i < 25; i++) {
      html += `<option>${i}</option>`;
    }
    document.getElementById("SelectVolumeTo").innerHTML = html;
  }

  // Populate Modal SelectVolumeFrom
  PopulateSelectVolumeFrom();
  PopulateSelectVolumeTo();

  // add listeners

  document
    .getElementById("get_all_routes")
    .addEventListener("click", get_all_routes);

  document
    .getElementById("jurisSelect")
    .addEventListener("click", populate_juris_type_select);

  document
    .getElementById("jurisTypeSelect")
    .addEventListener("click", populate_juris_route_id_select);

  document
    .getElementById("populate_juris_select_btn")
    .addEventListener("click", populate_juris_select);

  document
    .getElementById("juris_select_btn")
    .addEventListener("click", get_juris_routes);

  document
    .getElementById("SelectVolumeFrom")
    .addEventListener("click", PopulateSelectVolumeTo);

  document
    .getElementById("getVolumesBtn")
    .addEventListener("click", get_volumes);

  document
    .getElementById("juris_select_btn")
    .addEventListener("click", get_juris_routes);
});
