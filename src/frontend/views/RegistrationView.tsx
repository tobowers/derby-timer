import React, { useState } from 'react';
import { AlertCircle, Users, CheckCircle, Search, Plus, Trash2, CheckSquare, XSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Racer } from '../types';
import { api } from '../api';
import { useApp } from '../context';

export function RegistrationView() {
  const { currentEvent, racers, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState('racers');
  const [searchTerm, setSearchTerm] = useState('');

  if (!currentEvent) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <p className="text-xl text-slate-500 font-semibold">Please select an event first</p>
      </div>
    );
  }

  const inspectedCount = racers.filter(r => r.weight_ok).length;
  const inspectionPercent = racers.length > 0 ? Math.round((inspectedCount / racers.length) * 100) : 0;

  const filteredRacers = racers.filter(r => {
    const nameMatch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const carMatch = (r.car_number || '').includes(searchTerm);
    return nameMatch || carMatch;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
          Registration
        </h1>
        <div className="flex items-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Users size={18} className="text-orange-500" />
            <span className="font-semibold">{racers.length} Racers</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="font-semibold">{inspectedCount} Inspected ({inspectionPercent}%)</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="racers" className="font-semibold">Racers</TabsTrigger>
          <TabsTrigger value="inspection" className="font-semibold">Inspection</TabsTrigger>
        </TabsList>
        
        <TabsContent value="racers">
          <RacersTab racers={filteredRacers} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </TabsContent>
        
        <TabsContent value="inspection">
          <InspectionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RacersTab({ racers, searchTerm, setSearchTerm }: { racers: Racer[], searchTerm: string, setSearchTerm: (s: string) => void }) {
  const { currentEvent, refreshData } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRacerName, setNewRacerName] = useState('');
  const [newRacerDen, setNewRacerDen] = useState('');
  const [newRacerCarNumber, setNewRacerCarNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRacerName.trim() || !newRacerCarNumber) return;
    
    await api.createRacer(currentEvent!.id, {
      name: newRacerName.trim(),
      den: newRacerDen || null,
      car_number: newRacerCarNumber,
    });
    
    setNewRacerName('');
    setNewRacerDen('');
    setNewRacerCarNumber('');
    setShowAddForm(false);
    refreshData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this racer?')) return;
    await api.deleteRacer(id);
    refreshData();
  };

  return (
    <div>
      {showAddForm ? (
        <Card className="mb-6 border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg">Add New Racer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Full Name *
                </label>
                <Input 
                  value={newRacerName}
                  onChange={(e) => setNewRacerName(e.target.value)}
                  required 
                  placeholder="Johnny Smith"
                  className="h-12"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Den
                </label>
                <Input 
                  value={newRacerDen}
                  onChange={(e) => setNewRacerDen(e.target.value)}
                  placeholder="Wolf"
                  className="h-12"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Car # *
                </label>
                <Input 
                  value={newRacerCarNumber}
                  onChange={(e) => setNewRacerCarNumber(e.target.value)}
                  required 
                  placeholder="7"
                  className="h-12"
                />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Racer
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="h-12 px-6">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              type="text"
              placeholder="Search racers or car numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-white border-slate-300"
            />
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold ml-4 h-12"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Racer
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {racers.map(racer => (
          <Card 
            key={racer.id} 
            className="group hover:border-orange-300 transition-all"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl border-2",
                  racer.weight_ok 
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-slate-100 text-slate-500 border-slate-300"
                )}>
                  #{racer.car_number}
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-900">{racer.name}</p>
                  <div className="flex gap-2 text-sm text-slate-500 mt-1">
                    {racer.den && (
                      <Badge variant="secondary" className="font-medium">{racer.den}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {racer.weight_ok ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Inspected
                  </Badge>
                ) : (
                  <span className="text-slate-400 text-sm">Pending</span>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(racer.id)} 
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {racers.length === 0 && !showAddForm && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg text-slate-500 font-medium">No racers registered yet</p>
            <p className="text-slate-400 mt-1">Click "Add Racer" to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InspectionTab() {
  const { racers, refreshData } = useApp();

  const handleInspect = async (racerId: string, pass: boolean) => {
    await api.inspectRacer(racerId, pass);
    refreshData();
  };

  if (racers.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-300">
        <CardContent className="text-center py-12 text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>No racers to inspect yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {racers.map(racer => (
        <Card 
          key={racer.id} 
          className={cn(
            "border-2",
            racer.weight_ok 
              ? "bg-emerald-50 border-emerald-300" 
              : "border-slate-200"
          )}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-lg flex items-center justify-center font-black text-xl border-2",
                racer.weight_ok 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300" 
                  : "bg-slate-100 text-slate-500 border-slate-300"
              )}>
                #{racer.car_number}
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900">{racer.name}</p>
                {racer.den && (
                  <Badge variant="secondary" className="mt-1">{racer.den}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {racer.weight_ok ? (
                <>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 mr-4">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    PASSED
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleInspect(racer.id, false)}
                  >
                    Reset
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => handleInspect(racer.id, true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    PASS
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleInspect(racer.id, false)}
                    className="border-red-300 text-red-500 hover:bg-red-50"
                  >
                    <XSquare className="w-4 h-4 mr-1" />
                    FAIL
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
