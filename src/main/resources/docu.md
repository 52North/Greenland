### Visualization Client ###

Verwendet Grafiken von http://projects.opengeo.org/geosilk 
(Creative Commons Attribution 3.0 License) 

## OpenLayers.Layer.VIS.Vector ##

OM Vektordaten werden mittels OpenLayers.Layer.VIS.Vector in eine OpenLayers.Map 
eingebunden. Um OM Daten lesen zu k�nnen gibt es hierzu zwei OpenLayers.Format 
Implementierungen:
	- OpenLayers.SOS.Format.JSOM f�r JSON encodierte OM2 collections
	- OpenLayers.SOS.Format.ObservationCollection f�r XML OM collections

Die Format Klassen �bertragen die OM Daten in OpenLayers.SOS.ObservationSeries 
vector features, aggregiert nach featureOfInterest, observedPropery und procedure.

Da jedes dabei resultierende Feature eigens projiziert sein kann, muss eine 
OpenLayers.Layer.VIS.Strategy.FeatureProjection Instanz als layer strategy definiert 
werden werden, die jedes einzelne Feature in das map-Referenzsystem transformiert. 

> new OpenLayers.Layer.VIS.Vector ("Titel", {
>	strategies : [ new OpenLayers.Layer.VIS.Strategy.FeatureProjection() ],
>	protocol: new OpenLayers.Protocol.HTTP({
>		url : "url",
>		format : new OpenLayers.SOS.Format.JSOM() 
>	})
>	// weitere optionen
> })

Weitere �ber die �blichen OpenLayers.Layer.Vector hinausgehende config Parameter 
sind hierbei visualization und resultValue:

visualization:
OpenLayers.VIS.Symbology.NumericVector oder OpenLayers.VIS.Symbology.CategoricalVector Objekt
	- Verwaltet Visualisierungsparameter
	- Basis f�r event handling bei Parameter�nderungen
	- �berwacht Hinzuf�gen/�ndern von Features

resultValue:
OpenLayers.VIS.ResultValue Implementierung
	- Transformiert observations in darzustellenden Wert
	- Erzeugt Plots

# OpenLayers.SOS.ObservationSeries #
Die UncertML observation values werden als mehrdimensionales Array hinterlegt (timeValueArray), 
bestehend aus Zeit (als zweidimensionales Array) und dem eigentlichen Wert:
	- Summary Statistics (Mean, Variance, StandardDeviation, Quantile, Probability) 
	als VIS.StatisticsValue Objekt (parser/statisticsvalue.js)
	- Distributions (Normal, LogNormal) als entsprechende jStat Objekt (durch die DistributionFactory, jstat/jstat.js)
	- Realisierungen als Array von primitive Typen
Darzustellender Wert wird �ber resultValue-Instanz des zugeh�rigen Layer bestimmt, bei 
�nderung von Parametern oder Zeit, und in resultValue Attribut gespeichert.
Values werden in jsom.js geparst (parseUncertainty-Funktion)

# OpenLayers.VIS.ResultValue #
OpenLayers.VIS.ResultValue.Mean
	- Verarbeitet Distributions, numerische Realisierungen, Mean Summary Statistics
	- Plot mit confidence interval
	- Selektion von Realisierungen -> Histogramm
	- Selektion von Distrinutions -> jStat Plot

OpenLayers.VIS.ResultValue.Mode
	- Nur kategorische Realisierungen
	- Selektion -> Pie/Bar chart

OpenLayers.VIS.ResultValue.ModeProbability
	- Nur kategorische Realisierungen

OpenLayers.VIS.ResultValue.ExceedanceProbability 
	- Distributions und numerische Realisierungen
	- Parameter f�r exceedance value

OpenLayers.VIS.ResultValue.Statistics
	- Generische Implementierung f�r Summary Statistics (VIS.StatisticsValue)
	- statisticsType config option f�r Angabe des speziellen statistics Typen

OpenLayers.VIS.ResultValue.Custom
	- config option resultValueMap um mehrere OpenLayers.VIS.ResultValue anzugeben
	- Parameter f�r eigene Funktionsvorschrift
	- "Vorkompilierung" eigener Funktion in updateFunction

# Styler #
Ein "Styler" kapselt sozusagen eine einzelne Eigenschaft eines OpenLayers.Style 
Objektes. Sie werden in den OpenLayers.VIS.Symbology Implementierungen verwendet um 
Features entsprechend ihres Wertes zu ver�ndern. Ein OpenLayers.Layer.VIS.Vector 
Layer erh�lt dabei das n�tige OpenLayers.Style Objekt von dem zugeordneten 
visualization Objekt, welche es so konfiguriert, dass jeder definierte "Styler" 
aufgerufen wird um seinen zugeh�rigen Eigenschaftswert basierend auf dem Feature 
Wert zu ver�ndern, f�r jedes einzelne Feature. "Styler" sind dabei den 
OpenLayers.VIS.Symbology zugeordnet, um weitere Nutzerparameter zu erm�glichen 
(Layer Settings Fenster). 



## OpenLayers.Layer.VIS.Raster ##
OpenLayers.Layer.VIS.Raster verhalten sich wie �bliche OpenLayers.Layer.WMS Layer, 
ben�tigen jedoch die zus�tzliche visualization config option vom Typ 
OpenLayers.VIS.Visualization (resource.js). Zweck ist es, hiervon eine WMS Referenz 
zu erhalten, sobald der layer geladen wird, die Zeit oder Parameter ge�ndert werden. 
Die Visualization Klasse erbt dabei von OpenLayers.VIS.Symbology.Vector, um "Styler" 
basierte Wertegrenzen und Legendenfunktionen zu erm�glichen.


## OpenLayers.Layer.VIS.MultiProxyVector ##
Selektion von Vektor features ist hierin ausgelagert. Selektion wird 
normalerweise mittels eines OpenLayers.Control.SelectFeature map-controls 
durchgef�hrt. Werden mehrere vector layer zur Auswahl definiert, werden 
diese auf DOM Ebene zusammengef�gt und an oberster Stelle des layer-stack 
gesetzt. Dies f�hrt zu Problemen mit Raster layern und verhindert manuelles 
Anordnen von layern.

Der MultiProxyVector layer reagiert auf das Hinzuf�gen von VIS vector layern,
kopiert dessen features und lagert sich selbst an oberster Stelle. Selektion 
wird nur auf diesem layer ausgef�hrt. Jedes eigene feature wird transparent 
dargestellt und l�sst sich somit genau wie das Original selektieren. Nur bei 
Auswahl wird eine Umrandung hervorgehoben.
Dazu werden zwei OpenLayers.Control.SelectFeature kombiniert (Hervorheben/Ausw�hlen),
eine Ext.Tooltip Instanz zum Anzeigen von Tooltips verwaltet und Methoden zum
einfachen Verwenden der SelectFeature controls bereitgestellt (Box selection, usw.)


## GUI ##
Libraries:
	- OpenLayers 2.12
	- ExtJS 3.4 (http://docs.sencha.com/ext-js/3-4/)
	- GeoExt 1.0 (http://geoext.org/) f�r MapPanel (Verbindung von OpenLayers mit ExtJS)
	- Flot f�r Plots (damit auch jQuery)

Eigene Erweiterungen von GUI-Standardkomponenten:
	- Ext.ux.VIS.Slider (slider.js), Erweitung von Ext.slider.MultiSlider um snapValues Eigenschaft zur Angabe irregul�rer ticks
	- Ext.ux.VIS.FlotPanel (flotpanel.js), Erweiterung von Ext.Panel um Flot Plots einzubingen. Flot Eventhandling, Aktualisierungen von Plots bei Gr��en�nderung, Zoom, Pan
	- Ext.ux.VIS.FeatureArrow (featurearrow.js), Erweiterung/Zweckentfremdung von GeoExt.FeatureRenderer um dynamisch ein Dreieck zu Zeichnen (ExtJS 3.4 unterst�tzt dies noch nicht), welches eine Verbindung von Fenstern mit map-features erm�glichen soll. 
	- Ext.ux.VIS.LegendScaleBar (scalebar.js), Erweiterung von Ext.Panel, ben�tigt Visualization als config option, reagiert auf dessen events um Legende anzuzeigen/zu aktualisieren.
	- Ext.ux.VIS.ResourceNodesContainer (resourcetree.js) als Wurzel der Ressourcenauswahl. addResource Methode f�gt Ressource hinzu, erwartet Objekt mit mime,url,(request). Zur Verwendung in Ext.tree.TreePanel.
	- Ext.ux.VIS.ResourceLoader (resourcetree.js) verwendet von Ext.ux.VIS.ResourceNodesContainer, verwaltet das Laden von Knoten. Lazy loading von VISS Ressourcen und loakeln OM Daten. Gibt letztendlich alle n�tigen Informationen zum Konfigurieren von VIS Layern nach Nutzerwahl zur�ck.
	

