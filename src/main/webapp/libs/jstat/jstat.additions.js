var LinearInterpolatedQuantilesDistribution = ContinuousDistribution.extend({
    init: function(quantiles) {
    	//[{level: 0.5, value: 0.2}]
        this._super('LinearInterpolatedQuantiles');
        this._mean = parseFloat(mean);
        this._sigma = parseFloat(sigma);
        this._string = "Normal ("+this._mean.toFixed(2)+", " + this._sigma.toFixed(2) + ")";
    },
    _pdf: function(x, give_log) {/* TODO */},
    _cdf: function(x, lower_tail, log_p) {/* TODO */},
    getMean: function() {/* TODO */},
    getSigma: function() {/* TODO */},
    getVariance: function() {/* TODO */}
});

var SingleValuePseudoDistribution = ContinuousDistribution.extend({
    init: function(val) {
    	//[{level: 0.5, value: 0.2}]
        this._super('SingleValuePseudo');
        this._mean = parseFloat(val);
        this._sigma = 0.0;
        this._string = this._mean.toFixed(2);
    },
    _pdf: function(x, give_log) {/* TODO */},
    _cdf: function(x, lower_tail, log_p) {/* TODO */},
    getMean: function() {return this._mean;},
    getSigma: function() {return this._sigma;},
    getVariance: function() {return 0.0;}
});


ContinuousDistribution.prototype.getExceedanceProbability = function(t) {
	return Math.random();
};

ContinuousDistribution.prototype.getConfidenceInterval = function(p) {
	return [this.getQuantile(p), this.getQuantile(1 - p)];
};


DistributionFactory._build = DistributionFactory.build;
DistributionFactory.build = function(json) {
	if (json.LinearInterpolatedQuantiles) {
		/* TODO */
	} else {
		return DistributionFactory._build(json);
	}
};
